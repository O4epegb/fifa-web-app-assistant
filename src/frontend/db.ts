import * as fs from 'fs';
import * as csvparser from 'csv-parse';
import * as csvstringify from 'csv-stringify';
import { PlayerSnapshot } from './models';

const dbFileName = 'db.csv';

export function getPlayers() {
    return new Promise<Array<PlayerSnapshot>>((resolve, reject) => {
        const playersString = fs.readFileSync(dbFileName).toString();
        csvparser(playersString, { columns: true }, (err, data) => {
            if (!err) {
                resolve(
                    data.map(item => {
                        return {
                            ...item,
                            price: Number(item.price),
                            number: Number(item.number)
                        } as PlayerSnapshot;
                    })
                );
            } else {
                console.log(err);
                reject();
            }
        });
    });
}

// TODO any type to player
export function savePlayers(players: any) {
    return new Promise<Array<PlayerSnapshot>>((resolve, reject) => {
        const columns = Object.keys(players[0]);
        csvstringify(players, { header: true, columns }, (err, output) => {
            if (!err) {
                fs.writeFileSync(dbFileName, output);
                resolve();
            } else {
                console.log(err);
                reject(err);
            }
        });
    });
}
