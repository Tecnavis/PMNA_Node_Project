import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../store';
import { useEffect } from 'react';
import { setPageTitle } from '../store/themeConfigSlice';


const Analytics = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Analytics Admin'));
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    return <>
        sds
    </>
};

export default Analytics;
