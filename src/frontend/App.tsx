import * as React from 'react';
import { observer } from 'mobx-react';
import { ipcRenderer } from 'electron';
import * as u from '../utils';
import { shortcutNames, microDelay } from '../constants';
import { inputs } from '../inputPositions';
import { Coord } from '../models';
import { store } from './store';

@observer
export class App extends React.Component<{}, {}> {
    componentDidMount() {
        store.reloadPlayersFromDb();

        ipcRenderer.on('shortcut-press', (event, shortcutName) => {
            switch (shortcutName) {
                case shortcutNames.one: {
                    u.moveAndClick(inputs.buyNowButton);
                    break;
                }
                case shortcutNames.two: {
                    u.moveAndClick(inputs.buyNowButtonOk);
                    break;
                }
                case shortcutNames.three: {
                    this.searchHandler();
                    break;
                }
                case shortcutNames.four: {
                    u.moveAndClick(inputs.backButton);
                    break;
                }
                case shortcutNames.five: {
                    this.toggleAutoSearch();
                    break;
                }
                case shortcutNames.six: {
                    const coords = u.getMouseCoords();
                    console.log(
                        `Coords: x: ${coords.x}, y: ${
                            coords.y
                        }; Color: #${u.getPixelColor(coords)}`
                    );
                    break;
                }
            }
        });
    }

    toggleAutoSearch = () => {
        store.setValue('isAutoSearchActive', !store.isAutoSearchActive);
        u.notify(
            `AutoSearch toggled to ${store.isAutoSearchActive.toString()}`
        );
    };

    checkPlayerFound = () => {
        return new Promise((resolve, reject) => {
            function checkColors() {
                const modifySearchIconColor = u.getPixelColor(
                    inputs.modifySearchIcon
                );
                if (modifySearchIconColor === inputs.modifySearchIcon.color) {
                    return resolve(false);
                }

                const firstPlayerCardColor = u.getPixelColor(
                    inputs.firstPlayerCard
                );
                if (firstPlayerCardColor === inputs.firstPlayerCard.color) {
                    return resolve(true);
                }

                setTimeout(checkColors, 30);
            }

            checkColors();
        });
    };

    getPlayerSearchItem(n: number): Coord {
        return {
            1: inputs.playerSearchItem1,
            2: inputs.playerSearchItem2,
            3: inputs.playerSearchItem3
        }[n];
    }

    getPriceIncreaseNumber = (priceIncrease: number, price: number): number => {
        // < 50k => 250
        // 50k-100k => 500
        // > 100k => 1000
        if (price < 50000) {
            return priceIncrease * 250;
        } else if (price < 100000) {
            return priceIncrease * 500;
        } else {
            return priceIncrease * 1000;
        }
    };

    searchHandler = async () => {
        if (store.players.length === 0) {
            u.log('No players in DB');
            return;
        }

        const nextIndex = store.currentPlayerIndex + 1;
        store.setValue(
            'currentPlayerIndex',
            nextIndex >= store.players.length ? 0 : nextIndex
        );

        if (nextIndex >= store.players.length) {
            u.moveAndClick(inputs.increaseMinBid);
            await u.delay(microDelay);
        }

        const currentPlayer = store.activePlayer;
        const priceString = store.activePlayerPrice;

        console.log(
            `Checking player "${
                currentPlayer.name
            }" with minPrice = ${priceString}`
        );

        try {
            await u.delay(microDelay);
            u.moveAndClick(inputs.clearPlayerInput);
            await u.delay(microDelay);
            u.moveAndClick(inputs.playerInput);
            await u.delay(microDelay);
            u.typeString(currentPlayer.name);
            await u.waitForColor(
                inputs.searchPlayerCard.color,
                inputs.searchPlayerCard
            );
            const playerNotFoundIconColor = u.getPixelColor(
                inputs.playerNotFoundIcon
            );
            if (playerNotFoundIconColor === inputs.playerNotFoundIcon.color) {
                if (store.isAutoSearchActive) {
                    setTimeout(() => {
                        if (store.isAutoSearchActive) {
                            this.startSearchAgain();
                        }
                    }, 100);
                    throw Error(
                        `Player ${currentPlayer.name} not found in the list`
                    );
                }
            }
            u.moveAndClick(this.getPlayerSearchItem(currentPlayer.number));
            await u.delay(microDelay);
            u.moveAndClick(inputs.clearPriceInput);
            u.moveAndClick(inputs.priceInput);
            await u.delay(microDelay);
            u.typeString(priceString);
            u.moveAndClick(inputs.searchButton);
            const wasFound = await this.checkPlayerFound();
            if (wasFound) {
                u.notify(
                    `FOUND! ${
                        currentPlayer.name
                    } for less than ${priceString} gold`,
                    `
                    Player minimal price is ${currentPlayer.price} gold
                `
                );
            } else {
                u.log(
                    `Not found! ${currentPlayer.name}`,
                    `For less than ${priceString} gold`
                );
                u.moveAndClick(inputs.modifySearchButton);
                await u.waitForColor(
                    inputs.searchButton.color,
                    inputs.searchButton
                );
                if (store.isAutoSearchActive) {
                    this.startSearchAgain();
                }
            }
        } catch (error) {
            console.log(`Something went wrong.`, error);
        }
    };

    startSearchAgain = () => {
        this.searchHandler();
    };

    render() {
        if (store.isAutoSearchActive) {
            return (
                <div className="player-info">
                    {store.activePlayer ? (
                        <React.Fragment>
                            <h1 className="player-name">
                                {store.activePlayer.name}
                            </h1>
                            <div className="player-price">
                                {store.activePlayer.price.toLocaleString()}
                            </div>
                            <div className="player-price">
                                {Number(
                                    store.activePlayerPrice
                                ).toLocaleString()}
                            </div>
                        </React.Fragment>
                    ) : (
                        <h1 className="player-name">No active player</h1>
                    )}
                </div>
            );
        }

        return (
            <div className="main">
                <div className="controls">
                    <div>
                        <button type="button" onClick={store.reloadData}>
                            Reload from futbin
                        </button>
                        <input
                            type="text"
                            placeholder="Futbin pages to load"
                            value={store.totalPagesToLoad}
                            onChange={event =>
                                store.setValue(
                                    'totalPagesToLoad',
                                    Number(event.target.value) || 0
                                )
                            }
                        />
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <div>Price filter</div>
                        <input
                            type="text"
                            placeholder="price from"
                            value={store.priceFrom}
                            onChange={event =>
                                store.setValue(
                                    'priceFrom',
                                    Number(event.target.value) || 0
                                )
                            }
                        />
                        <input
                            type="text"
                            placeholder="price to"
                            value={store.priceTo}
                            onChange={event =>
                                store.setValue(
                                    'priceTo',
                                    Number(event.target.value) || 0
                                )
                            }
                        />
                        <div>Price multiplier, %</div>
                        <input
                            type="text"
                            placeholder="multiplier"
                            value={store.priceMultiplier}
                            onChange={event =>
                                store.setValue(
                                    'priceMultiplier',
                                    Number(event.target.value) || 0
                                )
                            }
                        />
                        <div>Max price</div>
                        <input
                            type="text"
                            placeholder="max price"
                            value={store.maxPrice}
                            onChange={event =>
                                store.setValue(
                                    'maxPrice',
                                    Number(event.target.value) || 0
                                )
                            }
                        />
                    </div>
                </div>
                <div className="content">
                    Total: {store.players.length}
                    {store.players.length === 0 && (
                        <div>No players loaded.</div>
                    )}
                    {store.players.map((player, index) => {
                        const isActive = store.activePlayer === player;

                        return (
                            <div
                                key={player.id}
                                style={{
                                    background: `${
                                        isActive ? 'tomato' : 'white'
                                    }`,
                                    margin: '2px 0',
                                    padding: '2px 0'
                                }}
                            >
                                <span
                                    style={{
                                        padding: '0 4px',
                                        display: 'inline-block',
                                        width: '25px'
                                    }}
                                >
                                    {index + 1}
                                </span>
                                <input
                                    disabled
                                    type="text"
                                    value={player.name}
                                />
                                <input
                                    style={{ width: '80px' }}
                                    type="text"
                                    value={player.price}
                                    onChange={event =>
                                        player.changePrice(event.target.value)
                                    }
                                />
                                <input
                                    disabled
                                    type="text"
                                    value={player.rating}
                                    style={{ width: '40px' }}
                                />
                                <span
                                    style={{
                                        padding: '0 4px',
                                        display: 'inline-block'
                                    }}
                                >
                                    {player.rating}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}
