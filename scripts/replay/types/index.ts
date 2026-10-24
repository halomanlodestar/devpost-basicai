/** @format */

export interface Emitter {
  id: string;
  secret: string;
}

export interface SendOptions {
  /** sign with a wrong key: the API must reject it */
  forge?: boolean;
}

export interface SendResult {
  status: number;
  body: unknown;
}
