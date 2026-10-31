import { signal, effect } from './dom.js';
import { write } from './store.js';

const media = matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

/** 'auto' | 'light' | 'dark' — shared by every NullZeroVibe app on the origin (key: nzv:theme). */
export const themePref = signal(['auto', 'light', 'dark'].includes(root.dataset.themePref) ? root.dataset.themePref : 'auto');
export const theme = signal(root.dataset.theme || 'dark');

const resolve = () => {
    const t = themePref.value === 'auto' ? (media.matches ? 'dark' : 'light') : themePref.value;
    theme.value = t;
    root.dataset.theme = t;
    root.dataset.themePref = themePref.value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#14172b' : '#f5f6fb');
};

effect(() => {
    write('nzv:theme', themePref.value);
    resolve();
});
media.addEventListener('change', resolve);

export const THEMES = [
    { value: 'auto', label: 'Auto', icon: 'monitor' },
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
];

export const ACCENTS = [
    { value: 'cyan', label: 'Cyan' },
    { value: 'magenta', label: 'Magenta' },
    { value: 'yellow', label: 'Yellow' },
];

export const setAccent = (accent) => { root.dataset.accent = accent; };
