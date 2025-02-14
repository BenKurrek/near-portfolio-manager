export interface MpcSignature {
  big_r: {
    affine_point: string;
  };
  s: {
    scalar: string;
  };
  recovery_id: number;
}
