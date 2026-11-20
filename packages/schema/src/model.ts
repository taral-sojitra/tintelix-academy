export type Inputs = Record<string, number>;
export type Outputs = Record<string, number>;

/** A pure function from settings to numbers. Every number a lesson shows comes from here. */
export interface Model {
  defaults: Inputs;
  run(inputs: Inputs): Outputs;
}
