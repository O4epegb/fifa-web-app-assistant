import { types, Instance, SnapshotIn } from 'mobx-state-tree';

export type PlayerType = Instance<typeof Player>;
export type PlayerSnapshot = SnapshotIn<typeof Player>;
export type Players = Array<PlayerType>;
export const Player = types
    .model({
        id: types.string,
        name: types.string,
        price: types.number,
        rating: types.string,
        number: types.number
    })
    .actions(self => {
        return {
            changePrice(price: string | number) {
                self.price = Number(price) || 0;
            }
        };
    });
