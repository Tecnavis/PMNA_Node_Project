import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import IconPencilPaper from '../../components/Icon/IconPencilPaper';
import IconPhone from '../../components/Icon/IconPhone';

const Profile = () => {
    const phone = localStorage.getItem('phone');
    const profileImageUrl = localStorage.getItem('profileImageUrl');

    const [driverData, setDriverData] = useState<any>(null);
    
    useEffect(() => {
        const fetchDriverData = async () => {
            const db = getFirestore();
            const q = query(collection(db, 'driver'), where('phone', '==', phone));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                setDriverData(doc.data());
                
            });
        };
        
        if (phone) {
            fetchDriverData();
        }
    }, [phone]);
    useEffect(() => {
        console.log("aa",driverData?.profileImageUrl);
    }, [driverData]);
    useEffect(() => {
        console.log("Driver Data:", driverData);
    }, [driverData]);
    
    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Users
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Profile</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-1 gap-5 mb-5">
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Profile</h5>
                            <Link to="/users/user-account-settings" className="ltr:ml-auto rtl:mr-auto btn btn-primary p-2 rounded-full">
                                <IconPencilPaper />
                            </Link>
                        </div>
                        <div className="mb-5">
                            <div className="flex flex-col justify-center items-center">
                            {driverData && (
    <img src={driverData.profileImageUrl} alt="img" className="w-24 h-24 rounded-full object-cover mb-5" />
)}

                                {driverData && (
                                    <p className="font-semibold text-primary text-xl">{driverData.driverName}</p>
                                )}
                            </div>
                            <ul className="mt-5 flex flex-col max-w-[160px] m-auto space-y-4 font-semibold text-white-dark">

                            <li className="flex items-center gap-2">
                                    {driverData && (
                                        <p>Driver ID: {driverData.idnumber}</p>
                                    )}
                                </li>
                                </ul>
                                <ul className="mt-5 flex flex-col max-w-[160px] m-auto space-y-4 font-semibold text-white-dark">

<li className="flex items-center gap-2">
        {driverData && (
            <p>Services:<br/> <div className='ml-6 mt-2'>{driverData.selectedServices}</div> </p>
        )}
    </li>
    </ul>
   
                            <ul className="mt-5 flex flex-col max-w-[160px] m-auto space-y-4 font-semibold text-white-dark">
                                <li className="flex items-center gap-2">
                                    <IconPhone/>
                                    {driverData && (
                                        <p>Phone: {driverData.phone}</p>
                                    )}
                                </li>
                            </ul>
                            <ul className="mt-5 flex flex-col max-w-[160px] m-auto space-y-4 font-semibold text-white-dark">
                                <li className="flex items-center gap-2">
                                    <IconPhone/>
                                    {driverData && (
                                        <p>Personal Phone: {driverData.personalphone}</p>
                                    )}
                                </li>
                            </ul>
                           
                        </div>
                    </div>
                   
                </div>
            </div>
        </div>
    );
};

export default Profile;
