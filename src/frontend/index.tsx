import * as React from 'react';
import * as ReactDom from 'react-dom';
import { App } from './App';

function main() {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);

    ReactDom.render(<App />, container);
}

main();
