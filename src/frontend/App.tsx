import * as React from 'react';
import { observer } from 'mobx-react';
import { ipcRenderer } from 'electron';
import { format } from 'date-fns';
import * as u from './utils';
import { shortcutNames, microDelay } from '../constants';
import { inputs } from './inputPositions';
import { Coord } from './models';
import { store } from './store';

@observer
export class App extends React.Component {
    componentDidMount() {
        store.loadPlayersFromDb();

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
                        }, color: '${u.getPixelColor(coords)}'`
                    );
                    break;
                }
            }
        });
    }

    toggleAutoSearch = () => {
        store.setValue('isAutoSearchActive', !store.isAutoSearchActive);
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
                console.log(inputs.firstPlayerCard.color, firstPlayerCardColor);
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
        if (store.isSearchInProgress) {
            return;
        }

        if (store.players.length === 0) {
            u.log('No players in DB');
            return;
        }

        store.setValue('isSearchInProgress', true);

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

        currentPlayer.checkPriceGraph();

        console.log(
            `Checking player "${
                currentPlayer.name
            }" with minPrice = ${priceString}`
        );

        try {
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
                        this.startSearchAgain();
                    }, 100);
                    throw Error(
                        `Player ${currentPlayer.name} not found in the list`
                    );
                }
            }
            u.moveAndClick(this.getPlayerSearchItem(currentPlayer.number));
            await u.waitForColor(
                inputs.bidPriceButton.color,
                inputs.bidPriceButton
            );
            // u.moveAndClick(inputs.clearPriceInput);
            u.moveAndClick(inputs.priceInput);
            await u.delay(50);
            u.typeString(priceString);
            u.moveAndClick(inputs.searchButton);
            const wasFound = await this.checkPlayerFound();
            if (wasFound) {
                store.setValue('isSearchInProgress', false);

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
                this.startSearchAgain();
            }
        } catch (error) {
            store.setValue('isSearchInProgress', false);

            console.log(`Something went wrong.`, error);
        }
    };

    startSearchAgain = () => {
        store.setValue('isSearchInProgress', false);
        if (store.isAutoSearchActive) {
            this.searchHandler();
        }
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
                            <div className="player-price-info">
                                <div className="player-graph">
                                    {store.activePlayer.prices.map(price => {
                                        return (
                                            <div
                                                key={price.date}
                                                className="player-graph__item"
                                            >
                                                <div className="player-graph__item-date">
                                                    {format(
                                                        price.date,
                                                        'DD.MM.YY'
                                                    )}
                                                </div>
                                                <div className="player-graph__item-price">
                                                    {price.price.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="player-prices">
                                    <div className="player-price">
                                        {store.activePlayer.price.toLocaleString()}
                                    </div>
                                    <div className="player-price">
                                        {Number(
                                            store.activePlayerPrice
                                        ).toLocaleString()}
                                    </div>
                                </div>
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
                    {store.detailedInfoPlayer && (
                        <div className="detailed-info">
                            <div>
                                <button
                                    onClick={() =>
                                        store.toggleDetailedInfo(null)
                                    }
                                >
                                    close
                                </button>
                            </div>
                            <div className="player-graph">
                                {store.detailedInfoPlayer.prices.map(price => {
                                    return (
                                        <div
                                            key={price.date}
                                            className="player-graph__item"
                                        >
                                            <div className="player-graph__item-date">
                                                {format(price.date, 'DD.MM.YY')}
                                            </div>
                                            <div className="player-graph__item-price">
                                                {price.price.toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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
                                    disabled
                                    style={{ width: '80px' }}
                                    type="text"
                                    value={player.price}
                                />
                                <button
                                    onClick={() =>
                                        player.changePrice(player.price - 1000)
                                    }
                                >
                                    -
                                </button>
                                <button
                                    onClick={() =>
                                        player.changePrice(player.price + 1000)
                                    }
                                >
                                    +
                                </button>
                                <input
                                    disabled
                                    type="text"
                                    value={player.rating}
                                    style={{ width: '40px' }}
                                />
                                <button onClick={() => player.getPriceGraph()}>
                                    get graph
                                </button>
                                <button
                                    onClick={() =>
                                        store.toggleDetailedInfo(player.id)
                                    }
                                >
                                    show graph
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}
