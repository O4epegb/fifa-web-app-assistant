import * as React from 'react';
import * as ReactDom from 'react-dom';
import { App } from './App';
import './index.css';

function main() {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);

    ReactDom.render(<App />, container);
}

main();
