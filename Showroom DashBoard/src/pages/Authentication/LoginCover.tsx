import { useEffect, useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconLockDots from '../../components/Icon/IconLockDots';
import IconUser from '../../components/Icon/IconUser';
import { useForm } from "react-hook-form";
import { ErrorMessage } from '@hookform/error-message';
import { axiosInstance, BASE_URL } from '../../config/axiosConfig';
import sweetAlert from '../../components/sweetAlert'

type FormValues = {
    username: string;
    password: string;
};


const LoginCover: React.FC = () => {

    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const signIn = async (formData: FormValues) => {
        try {
            const response = await axiosInstance.post(`${BASE_URL}/showroom/login`, formData);
            const { message, success, data, token } = response.data;

            localStorage.setItem('showroomId', data?._id);
            localStorage.setItem('userName', data?.username);
            localStorage.setItem('password', data?.password);
            localStorage.setItem('token', token);

            if (success) {
                sweetAlert({
                    title: "Login Successful!",
                    message,
                    type: "success",
                });

                setTimeout(() => navigate("/index"), 1500);
            }
        } catch (error: any) {
            console.error("Login error:", error);

            const message = error?.response?.data?.message || "Something went wrong";

            sweetAlert({
                title: "Login Failed",
                message,
                type: "error",
            });
        }
    };

    return (
        <div>
            <div className="absolute inset-0">
                <img src="/assets/images/auth/bg-gradient.png" alt="image" className="h-full w-full object-cover" />
            </div>
            <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
                <img src="/assets/images/auth/coming-soon-object1.png" alt="image" className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
                <img src="/assets/images/auth/coming-soon-object3.png" alt="image" className="absolute right-0 top-0 h-[300px]" />
                <img src="/assets/images/auth/polygon-object.svg" alt="image" className="absolute bottom-0 end-[28%]" />
                <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                    <div className="relative hidden w-full items-center justify-center p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]" style={{ background: 'linear-gradient(225deg, rgba(255, 255, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)' }}>
                        <div className="absolute inset-y-0 w-8 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>
                        <div className="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg]">
                            <Link to="/" className="w-48 block lg:w-72 ms-10">
                                <img src='/assets/images/auth/rsa-png.png' alt='log' className="w-full" />
                            </Link>
                            <div className="mt-24 hidden w-full max-w-[430px] lg:block">
                                <img src="/assets/images/auth/login.svg" alt="Cover Image" className="w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                        <div className="w-full max-w-[440px] lg:mt-16">
                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-danger md:text-4xl">Sign in</h1>
                                <p className="text-base font-bold leading-normal text-white-dark">Enter your email and password to login</p>
                            </div>
                            <form className="space-y-5 dark:text-white" onSubmit={handleSubmit(signIn)}>
                                <div>
                                    <label htmlFor="username">User Name</label>
                                    <div className="relative text-white-dark">
                                        <input
                                            id="username"
                                            type="text"
                                            placeholder="Enter Username"
                                            {...register("username", {
                                                required: "User name is required",
                                            })}
                                            className="form-input ps-10 placeholder:text-white-dark"
                                        />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                            <IconUser fill={true} />
                                        </span>
                                    </div>
                                    <ErrorMessage
                                        errors={errors}
                                        name="username"
                                        render={({ message }) => <p className="text-red-500">{message}</p>}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="Password">Password</label>
                                    <div className="relative text-white-dark">
                                        <input
                                            id="password"
                                            type="password"
                                            placeholder="Enter Password"
                                            {...register("password", {
                                                required: "Password is required",
                                            })}
                                            className="form-input ps-10 placeholder:text-white-dark"
                                        />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                            <IconLockDots fill={true} />
                                        </span>
                                    </div>
                                    <ErrorMessage
                                        errors={errors}
                                        name="password"
                                        render={({ message }) => <p className="text-red-500">{message}</p>}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn !mt-6 w-full border-0 uppercase text-white shadow-[0_10px_20px_-10px_rgba(255, 0, 0, 0.44)]"
                                    style={{
                                        background: 'linear-gradient(2deg, rgba(255, 255, 255, 1) 0%, rgba(255, 0, 0, 1) 100%)',
                                    }}
                                >
                                    Sign in
                                </button>
                            </form>
                        </div>
                        <p className="absolute bottom-6 w-full text-center dark:text-white">© {new Date().getFullYear()}. Tecnavis All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginCover;
