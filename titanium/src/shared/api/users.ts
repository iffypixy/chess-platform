export interface User {
  id: string;
  username: string;
  bullet: UserScore;
  blitz: UserScore;
  rapid: UserScore;
  classical: UserScore;
}

interface UserScore {
  rating: number;
  isCalibrated: boolean;
}
