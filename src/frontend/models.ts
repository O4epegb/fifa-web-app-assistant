import { types, Instance, SnapshotIn } from 'mobx-state-tree';
import { last } from 'lodash';
import { differenceInDays } from 'date-fns';
import { getPlayerPriceGraph } from './services';

export type PriceType = Instance<typeof Price>;
export type PriceSnapshot = SnapshotIn<typeof Price>;
export type Prices = Array<PriceType>;
export const Price = types.model({
    date: types.number,
    price: types.number
});

export type PlayerType = Instance<typeof Player>;
export type PlayerSnapshot = SnapshotIn<typeof Player>;
export type Players = Array<PlayerType>;
export const Player = types
    .model({
        id: types.string,
        originalId: types.string,
        name: types.string,
        price: types.number,
        rating: types.string,
        number: types.number,
        prices: types.array(Price)
    })
    .actions(self => {
        return {
            changePrice(price: string | number) {
                self.price = Number(price) || 0;
            },
            changePriceGraph(prices: Prices) {
                self.prices.replace(prices);
            },
            getPriceGraph() {
                getPlayerPriceGraph(self.originalId).then(prices => {
                    this.changePriceGraph(prices);
                });
            },
            checkPriceGraph() {
                if (
                    self.prices.length === 0 ||
                    differenceInDays(Date.now(), last(self.prices).price) >= 2
                ) {
                    this.getPriceGraph();
                }
            }
        };
    });

export interface Coord {
    x: number;
    y: number;
}
