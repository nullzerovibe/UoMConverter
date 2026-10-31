import { h, render, Fragment } from '../vendor/preact.js';
import htm from '../vendor/htm.js';

export { h, render, Fragment };
export * from '../vendor/hooks.js';
export { signal, computed, effect, batch, useSignal, useComputed, useSignalEffect } from '../vendor/signals.js';

export const html = htm.bind(h);

export const cx = (...parts) => parts.flat().filter(Boolean).join(' ');

/** Absolute URL of a kit file, so the kit works at any mount path (/, /RepoName/, file server). */
export const kitUrl = (path) => new URL(`../${path}`, import.meta.url).href;

const sprite = kitUrl('icons.svg');

export const Icon = ({ name, class: cls, label }) => html`
    <svg class=${cx('nzv-icon', cls)} aria-hidden=${label ? undefined : 'true'} role=${label ? 'img' : undefined} aria-label=${label}>
        <use href=${`${sprite}#i-${name}`} />
    </svg>`;
