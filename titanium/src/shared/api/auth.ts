export interface Credentials {
  id: string;
  username: string;
  bullet: {
    rating: number;
    isCalibrated: boolean;
  };
  blitz: {
    rating: number;
    isCalibrated: boolean;
  };
  rapid: {
    rating: number;
    isCalibrated: boolean;
  };
  classic: {
    rating: number;
    isCalibrated: boolean;
  };
}
