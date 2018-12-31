import { remote, screen } from 'electron';
import { autorun, values } from 'mobx';
import { types, onSnapshot } from 'mobx-state-tree';
import { merge, values as lodashValues } from 'lodash';
import { Player, Players } from './models';
import { getPlayers, savePlayers } from './db';
import { reloadFutbinData } from './services';

const Store = types
    .model({
        allPlayers: types.map(Player),
        detailedInfoPlayerId: types.maybeNull(types.string),
        totalPagesToLoad: types.number,
        isAutoSearchActive: types.boolean,
        isSearchInProgress: types.boolean,
        maxPrice: types.number,
        priceFrom: types.number,
        priceTo: types.number,
        priceMultiplier: types.number,
        currentPlayerIndex: types.number
    })
    .actions(self => {
        return {
            setValue<P extends keyof (typeof self)>(
                key: P,
                value: (typeof self)[P]
            ) {
                self[key] = value;
            },
            reloadData() {
                return reloadFutbinData(self.totalPagesToLoad).then(players => {
                    console.log(`Loaded ${players.length} players from futbin`);
                    this.addPlayers(players as Players);
                });
            },
            loadPlayersFromDb() {
                return getPlayers().then(players => {
                    console.log(`${players.length} players reloaded from db`);

                    this.addPlayers(players as Players);
                });
            },
            addPlayers(players: Players) {
                players.forEach(playerRaw => {
                    const player = self.allPlayers.get(playerRaw.id);

                    if (player) {
                        self.allPlayers.set(
                            playerRaw.id,
                            merge(player, playerRaw)
                        );
                    } else {
                        self.allPlayers.set(playerRaw.id, playerRaw);
                    }
                });
            },
            toggleDetailedInfo(id: string | null) {
                self.detailedInfoPlayerId = id;
            }
        };
    })
    .views(self => {
        return {
            get players(): Players {
                return values(self.allPlayers).filter(player => {
                    const price = Number(player.price);
                    return price <= self.priceTo && price >= self.priceFrom;
                });
            },
            get activePlayer() {
                if (
                    this.players.length === 0 ||
                    self.currentPlayerIndex > this.players.length
                ) {
                    return null;
                }

                return this.players[self.currentPlayerIndex];
            },
            get detailedInfoPlayer() {
                return self.allPlayers.get(self.detailedInfoPlayerId);
            },
            get activePlayerPrice() {
                const numericPrice = this.activePlayer.price;
                const priceWithDiscount =
                    (numericPrice * self.priceMultiplier) / 100;
                const discount = numericPrice - priceWithDiscount;
                const actualDiscount = discount < 5000 ? 5000 : discount;
                const price = numericPrice - actualDiscount;
                return Math.min(self.maxPrice, price).toFixed(0);
            }
        };
    });

export const store = Store.create({
    allPlayers: {},
    totalPagesToLoad: 10,
    isAutoSearchActive: false,
    isSearchInProgress: false,
    maxPrice: 500000,
    priceFrom: 50000,
    priceTo: 5000000,
    priceMultiplier: 85,
    currentPlayerIndex: 0
});

onSnapshot(store.allPlayers, newSnapshot => {
    savePlayers(lodashValues(newSnapshot)).then(() => {
        console.log('Saved players on disk');
    });
});

autorun(() => {
    const window = remote.getCurrentWindow();
    const { height } = screen.getPrimaryDisplay().workAreaSize;

    window.setAlwaysOnTop(store.isAutoSearchActive);

    if (store.isAutoSearchActive) {
        window.webContents.closeDevTools();
        window.setSize(400, 200);
        window.setPosition(0, height - 300);
    } else {
        window.setSize(1200, 800);
        window.webContents.openDevTools();
        window.center();
    }
});
