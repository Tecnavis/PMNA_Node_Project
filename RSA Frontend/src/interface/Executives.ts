export interface IMarketingExecutives {
    _id?:string,
    name: string,
    email: string,
    address: string,
    phone: string,
    userName: string,
    image: File | null
    password: string,
    confirmPassword?: string,
}