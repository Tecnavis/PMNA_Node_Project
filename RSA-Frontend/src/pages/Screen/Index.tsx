import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IRootState } from '../../store';
import ReactApexChart from 'react-apexcharts';
import './Index.css';
import axios from 'axios';
import { BASE_URL } from '../../config/axiosConfig';

const Index = ({ update }: { update: boolean }) => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [loading, setLoading] = useState(true);
    const [salesByCategory, setSalesByCategory] = useState({
        series: [0, 0, 0, 0],
        options: { /* Initial chart options */ }
    });
    const audioRef = useRef<HTMLAudioElement>(null); // Reference to the audio element

    useEffect(() => {
        const fetchBookings = async () => {
            const response = await axios.get(`${BASE_URL}/dashboard`);
            const data = response.data.bookingData[0]

            setSalesByCategory(prev => ({
                ...prev,
                series: [
                    data.newBookingsShowRoom,
                    data.newBookingsOther,
                    data.pendingBookings,
                    data.completedBookings
                ]
            }));
        };

        fetchBookings();
    }, [isDark]);

    useEffect(() => {
        if (salesByCategory.series[0] > 0 && audioRef.current) {
            audioRef.current.play();
        }
    }, [salesByCategory.series[0]]); // Play the sound only when the first value (ShowRoom Bookings) changes


    return (
        <div className="container mx-auto p-6 bg-cover bg-center bg-no-repeat">


            <div className="pt-5">
                <div className="grid xl:grid-cols-1 gap-6 mb-6">
                    <div className="grid xl:grid-cols-4 gap-6 mb-6">
                        <div className={`panel bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-lg shadow-lg p-6`} >
                            <h5 className="font-semibold text-lg mb-3">ShowRoom Booking</h5>
                            <p className="text-2xl">{salesByCategory.series[0]}</p>
                        </div>
                        <div className="panel bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-lg p-6">
                            <h5 className="font-semibold text-lg mb-3">New Bookings</h5>
                            <p className="text-2xl">{salesByCategory.series[1]}</p>
                        </div>
                        <div className="panel bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg shadow-lg p-6">
                            <h5 className="font-semibold text-lg mb-3">Pending Bookings</h5>
                            <p className="text-2xl">{salesByCategory.series[2]}</p>
                        </div>
                        <div className="panel bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg shadow-lg p-6">
                            <h5 className="font-semibold text-lg mb-3">Completed Bookings</h5>
                            <p className="text-2xl">{salesByCategory.series[3]}</p>
                        </div>
                    </div>
                </div>
            </div>
            <audio ref={audioRef} src="/public/mixkit-signal-alert-771.wav" preload="auto" />
        </div>
    );
};

export default Index;