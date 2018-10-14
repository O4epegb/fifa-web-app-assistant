import * as request from 'request-promise-native';
import * as cheerio from 'cheerio';
import { range, flatten, uniqBy } from 'lodash';

const formatters = {
    K: 1000,
    M: 1000000
};

function getUrl(page = 1) {
    return `https://www.futbin.com/19/players?page=${page}&version=gold_rare&sort=xbox_price&order=desc`;
}

function getPromises(totalPages: number) {
    return range(1, totalPages + 1).map(i => {
        return request(getUrl(i), {
            headers: {
                Cookie: 'platform=pc'
            }
        }).then((data: string) => {
            const $ = cheerio.load(data);
            const tr = $('#repTb tbody > tr');
            const players = tr.toArray().map(el => {
                const row = $(el);
                // const url = 'https://www.futbin.com' + encodeURI(row.attr('data-url'));
                const splittedUrl = decodeURI(
                    row.find('.player_name_players_table').attr('href')
                ).split('/');
                // const name = last(splittedUrl);
                const name = row.find('.player_name_players_table').text();
                const id = splittedUrl[splittedUrl.length - 2];
                const rating = row.find('.rating').text();
                const price = row
                    .find('.pc_color')
                    .text()
                    .trim();

                return {
                    id,
                    name,
                    rating,
                    price: price || '0',
                    number: 0
                };
            });

            return players;
        });
    });
}

export function reloadFutbinData(totalPages = 10) {
    return Promise.all(getPromises(totalPages)).then(data => {
        const playerCount = {};

        const players = flatten(data).map(player => {
            const { price } = player;

            if (playerCount[player.name]) {
                playerCount[player.name] = playerCount[player.name] + 1;
            } else {
                playerCount[player.name] = 1;
            }

            player.number = playerCount[player.name];

            const formatter = /(K|M)/.exec(price);
            const numericPrice = parseFloat(price);
            const formattedPrice = formatter
                ? formatters[formatter[0]] * numericPrice
                : numericPrice;

            return {
                ...player,
                price: formattedPrice
            };
        });

        return uniqBy(players, p => p.id);
    });
}
