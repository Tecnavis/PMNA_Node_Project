export interface Verification {
    _id: string;
    showroom: {
        _id: string;
        name: string;
        createdAt:string
    };
    executive: {
        _id: string;
        name: string;
    };
    verificationDate: string;
    geoTag: {
        coordinates: [number, number];
    };
    accuracy: number;
    image: string;
    isVerified: boolean;
    verificationAddedBy: {
        user: {
            _id: string;
            email: string;
        };
        userType: string;
    };
}