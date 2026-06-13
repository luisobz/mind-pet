export interface Clock {
  /** Milisegundos desde epoch. */
  now(): number;
}
