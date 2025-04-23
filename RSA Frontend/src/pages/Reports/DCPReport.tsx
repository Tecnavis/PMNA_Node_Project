import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconBell from '../../components/Icon/IconBell';
import IconXCircle from '../../components/Icon/IconXCircle';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../../constants/roles';
import { CLOUD_IMAGE } from '../../constants/status';

interface Company {
    _id: string;
    name: string;
    idNumber: string;
    creditLimitAmount: number;
    phone: string;
    cashInHand: number;
    driverSalary: number;
    personalPhoneNumber: string;
    password: string;
    vehicle: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}


interface Provider {
    _id: string;
    name: string;
    companyName: string;
    cashInHand: number;
    driverSalary: number;
    baseLocation: {
        _id: string;
        baseLocation: string;
        latitudeAndLongitude: string;
    };
    idNumber: string;
    creditAmountLimit: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    serviceDetails: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
}

export interface Driver {
    _id: string;
    name: string;
    idNumber: string;
    cashInHand: number;
    driverSalary: number;
    advance: number;
    phone: string;
    personalPhoneNumber: string;
    password: string;
    vehicle: [
        {
            serviceType: {
                _id: string;
                serviceName: string;
                firstKilometer: number;
                additionalAmount: number;
                firstKilometerAmount: number;
                expensePerKm: number;
            };
            basicAmount: number;
            kmForBasicAmount: number;
            overRideCharge: number;
            vehicleNumber: string;
        }
    ];
    image: string;
    companyName: string; //New Props
}

const rowData = [
    {
        id: 1,
        firstName: 'Caroline',
        lastName: 'Jensen',
        email: 'carolinejensen@zidant.com',
        dob: '2004-05-28',
        address: {
            street: '529 Scholes Street',
            city: 'Temperanceville',
            zipcode: 5235,
            geo: {
                lat: 23.806115,
                lng: 164.677197,
            },
        },
        phone: '+1 (821) 447-3782',
        isActive: true,
        age: 39,
        company: 'POLARAX',
    },
    {
        id: 2,
        firstName: 'Celeste',
        lastName: 'Grant',
        email: 'celestegrant@polarax.com',
        dob: '1989-11-19',
        address: {
            street: '639 Kimball Street',
            city: 'Bascom',
            zipcode: 8907,
            geo: {
                lat: 65.954483,
                lng: 98.906478,
            },
        },
        phone: '+1 (838) 515-3408',
        isActive: false,
        age: 32,
        company: 'MANGLO',
    },
    {
        id: 3,
        firstName: 'Tillman',
        lastName: 'Forbes',
        email: 'tillmanforbes@manglo.com',
        dob: '2016-09-05',
        address: {
            street: '240 Vandalia Avenue',
            city: 'Thynedale',
            zipcode: 8994,
            geo: {
                lat: -34.949388,
                lng: -82.958111,
            },
        },
        phone: '+1 (969) 496-2892',
        isActive: false,
        age: 26,
        company: 'APPLIDECK',
    },
    {
        id: 4,
        firstName: 'Daisy',
        lastName: 'Whitley',
        email: 'daisywhitley@applideck.com',
        dob: '1987-03-23',
        address: {
            street: '350 Pleasant Place',
            city: 'Idledale',
            zipcode: 9369,
            geo: {
                lat: -54.458809,
                lng: -127.476556,
            },
        },
        phone: '+1 (861) 564-2877',
        isActive: true,
        age: 21,
        company: 'VOLAX',
    },
    {
        id: 5,
        firstName: 'Weber',
        lastName: 'Bowman',
        email: 'weberbowman@volax.com',
        dob: '1983-02-24',
        address: {
            street: '154 Conway Street',
            city: 'Broadlands',
            zipcode: 8131,
            geo: {
                lat: 54.501351,
                lng: -167.47138,
            },
        },
        phone: '+1 (962) 466-3483',
        isActive: false,
        age: 26,
        company: 'ORBAXTER',
    },
    {
        id: 6,
        firstName: 'Buckley',
        lastName: 'Townsend',
        email: 'buckleytownsend@orbaxter.com',
        dob: '2011-05-29',
        address: {
            street: '131 Guernsey Street',
            city: 'Vallonia',
            zipcode: 6779,
            geo: {
                lat: -2.681655,
                lng: 3.528942,
            },
        },
        phone: '+1 (884) 595-2643',
        isActive: true,
        age: 40,
        company: 'OPPORTECH',
    },
    {
        id: 7,
        firstName: 'Latoya',
        lastName: 'Bradshaw',
        email: 'latoyabradshaw@opportech.com',
        dob: '2010-11-23',
        address: {
            street: '668 Lenox Road',
            city: 'Lowgap',
            zipcode: 992,
            geo: {
                lat: 36.026423,
                lng: 130.412198,
            },
        },
        phone: '+1 (906) 474-3155',
        isActive: true,
        age: 24,
        company: 'GORGANIC',
    },
    {
        id: 8,
        firstName: 'Kate',
        lastName: 'Lindsay',
        email: 'katelindsay@gorganic.com',
        dob: '1987-07-02',
        address: {
            street: '773 Harrison Avenue',
            city: 'Carlton',
            zipcode: 5909,
            geo: {
                lat: 42.464724,
                lng: -12.948403,
            },
        },
        phone: '+1 (930) 546-2952',
        isActive: true,
        age: 24,
        company: 'AVIT',
    },
    {
        id: 9,
        firstName: 'Marva',
        lastName: 'Sandoval',
        email: 'marvasandoval@avit.com',
        dob: '2010-11-02',
        address: {
            street: '200 Malta Street',
            city: 'Tuskahoma',
            zipcode: 1292,
            geo: {
                lat: -52.206169,
                lng: 74.19452,
            },
        },
        phone: '+1 (927) 566-3600',
        isActive: false,
        age: 28,
        company: 'QUILCH',
    },
    {
        id: 10,
        firstName: 'Decker',
        lastName: 'Russell',
        email: 'deckerrussell@quilch.com',
        dob: '1994-04-21',
        address: {
            street: '708 Bath Avenue',
            city: 'Coultervillle',
            zipcode: 1268,
            geo: {
                lat: -41.550295,
                lng: -146.598075,
            },
        },
        phone: '+1 (846) 535-3283',
        isActive: false,
        age: 27,
        company: 'MEMORA',
    },
    {
        id: 11,
        firstName: 'Odom',
        lastName: 'Mills',
        email: 'odommills@memora.com',
        dob: '2010-01-24',
        address: {
            street: '907 Blake Avenue',
            city: 'Churchill',
            zipcode: 4400,
            geo: {
                lat: -56.061694,
                lng: -130.238523,
            },
        },
        phone: '+1 (995) 525-3402',
        isActive: true,
        age: 34,
        company: 'ZORROMOP',
    },
    {
        id: 12,
        firstName: 'Sellers',
        lastName: 'Walters',
        email: 'sellerswalters@zorromop.com',
        dob: '1975-11-12',
        address: {
            street: '978 Oakland Place',
            city: 'Gloucester',
            zipcode: 3802,
            geo: {
                lat: 11.732587,
                lng: 96.118099,
            },
        },
        phone: '+1 (830) 430-3157',
        isActive: true,
        age: 28,
        company: 'ORBOID',
    },
    {
        id: 13,
        firstName: 'Wendi',
        lastName: 'Powers',
        email: 'wendipowers@orboid.com',
        dob: '1979-06-02',
        address: {
            street: '376 Greenpoint Avenue',
            city: 'Elliott',
            zipcode: 9149,
            geo: {
                lat: -78.159578,
                lng: -9.835103,
            },
        },
        phone: '+1 (863) 457-2088',
        isActive: true,
        age: 31,
        company: 'SNORUS',
    },
    {
        id: 14,
        firstName: 'Sophie',
        lastName: 'Horn',
        email: 'sophiehorn@snorus.com',
        dob: '2018-09-20',
        address: {
            street: '343 Doughty Street',
            city: 'Homestead',
            zipcode: 330,
            geo: {
                lat: 65.484087,
                lng: 137.413998,
            },
        },
        phone: '+1 (885) 418-3948',
        isActive: true,
        age: 22,
        company: 'XTH',
    },
    {
        id: 15,
        firstName: 'Levine',
        lastName: 'Rodriquez',
        email: 'levinerodriquez@xth.com',
        dob: '1973-02-08',
        address: {
            street: '643 Allen Avenue',
            city: 'Weedville',
            zipcode: 8931,
            geo: {
                lat: -63.185586,
                lng: 117.327808,
            },
        },
        phone: '+1 (999) 565-3239',
        isActive: true,
        age: 27,
        company: 'COMTRACT',
    },
    {
        id: 16,
        firstName: 'Little',
        lastName: 'Hatfield',
        email: 'littlehatfield@comtract.com',
        dob: '2012-01-03',
        address: {
            street: '194 Anthony Street',
            city: 'Williston',
            zipcode: 7456,
            geo: {
                lat: 47.480837,
                lng: 6.085909,
            },
        },
        phone: '+1 (812) 488-3011',
        isActive: false,
        age: 33,
        company: 'ZIDANT',
    },
    {
        id: 17,
        firstName: 'Larson',
        lastName: 'Kelly',
        email: 'larsonkelly@zidant.com',
        dob: '2010-06-14',
        address: {
            street: '978 Indiana Place',
            city: 'Innsbrook',
            zipcode: 639,
            geo: {
                lat: -71.766732,
                lng: 150.854345,
            },
        },
        phone: '+1 (892) 484-2162',
        isActive: true,
        age: 20,
        company: 'SUREPLEX',
    },
    {
        id: 18,
        firstName: 'Kendra',
        lastName: 'Molina',
        email: 'kendramolina@sureplex.com',
        dob: '2002-07-19',
        address: {
            street: '567 Charles Place',
            city: 'Kimmell',
            zipcode: 1966,
            geo: {
                lat: 50.765816,
                lng: -117.106499,
            },
        },
        phone: '+1 (920) 528-3330',
        isActive: false,
        age: 31,
        company: 'DANJA',
    },
    {
        id: 19,
        firstName: 'Ebony',
        lastName: 'Livingston',
        email: 'ebonylivingston@danja.com',
        dob: '1994-10-18',
        address: {
            street: '284 Cass Place',
            city: 'Navarre',
            zipcode: 948,
            geo: {
                lat: 65.271256,
                lng: -83.064729,
            },
        },
        phone: '+1 (970) 591-3039',
        isActive: false,
        age: 33,
        company: 'EURON',
    },
    {
        id: 20,
        firstName: 'Kaufman',
        lastName: 'Rush',
        email: 'kaufmanrush@euron.com',
        dob: '2011-07-10',
        address: {
            street: '408 Kingsland Avenue',
            city: 'Beaulieu',
            zipcode: 7911,
            geo: {
                lat: 41.513153,
                lng: 54.821641,
            },
        },
        phone: '+1 (924) 463-2934',
        isActive: false,
        age: 39,
        company: 'ILLUMITY',
    },
    {
        id: 21,
        firstName: 'Frank',
        lastName: 'Hays',
        email: 'frankhays@illumity.com',
        dob: '2005-06-15',
        address: {
            street: '973 Caton Place',
            city: 'Dargan',
            zipcode: 4104,
            geo: {
                lat: 63.314988,
                lng: -138.771323,
            },
        },
        phone: '+1 (930) 577-2670',
        isActive: false,
        age: 31,
        company: 'SYBIXTEX',
    },
    {
        id: 22,
        firstName: 'Carmella',
        lastName: 'Mccarty',
        email: 'carmellamccarty@sybixtex.com',
        dob: '1980-03-06',
        address: {
            street: '919 Judge Street',
            city: 'Canby',
            zipcode: 8283,
            geo: {
                lat: 9.198597,
                lng: -138.809971,
            },
        },
        phone: '+1 (876) 456-3218',
        isActive: true,
        age: 21,
        company: 'ZEDALIS',
    },
    {
        id: 23,
        firstName: 'Massey',
        lastName: 'Owen',
        email: 'masseyowen@zedalis.com',
        dob: '2012-03-01',
        address: {
            street: '108 Seaview Avenue',
            city: 'Slovan',
            zipcode: 3599,
            geo: {
                lat: -74.648318,
                lng: 99.620699,
            },
        },
        phone: '+1 (917) 567-3786',
        isActive: false,
        age: 40,
        company: 'DYNO',
    },
    {
        id: 24,
        firstName: 'Lottie',
        lastName: 'Lowery',
        email: 'lottielowery@dyno.com',
        dob: '1982-10-10',
        address: {
            street: '557 Meserole Avenue',
            city: 'Fowlerville',
            zipcode: 4991,
            geo: {
                lat: 54.811546,
                lng: -20.996515,
            },
        },
        phone: '+1 (912) 539-3498',
        isActive: true,
        age: 36,
        company: 'MULTIFLEX',
    },
    {
        id: 25,
        firstName: 'Addie',
        lastName: 'Luna',
        email: 'addieluna@multiflex.com',
        dob: '1988-05-01',
        address: {
            street: '688 Bulwer Place',
            city: 'Harmon',
            zipcode: 7664,
            geo: {
                lat: -12.762766,
                lng: -39.924497,
            },
        },
        phone: '+1 (962) 537-2981',
        isActive: true,
        age: 32,
        company: 'PHARMACON',
    },
];

const MultipleTables = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Multiple Tables'));
    });
    const role = localStorage.getItem('role') || '';

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(rowData, 'firstName'));
    const [recordsData, setRecordsData] = useState(initialRecords);

    const [search, setSearch] = useState('');
    const [searchDriver, setSearchDriver] = useState('');
    const [searchProviders, setSearchProviders] = useState('');
    const [searchCompnies, setSearchCompanies] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'firstName',
        direction: 'asc',
    });

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(() => {
            return rowData.filter((item) => {
                return (
                    item.firstName.toLowerCase().includes(search.toLowerCase()) ||
                    item.company.toLowerCase().includes(search.toLowerCase()) ||
                    item.age.toString().toLowerCase().includes(search.toLowerCase()) ||
                    item.dob.toLowerCase().includes(search.toLowerCase()) ||
                    item.email.toLowerCase().includes(search.toLowerCase()) ||
                    item.phone.toLowerCase().includes(search.toLowerCase())
                );
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus]);

    const [page2, setPage2] = useState(1);
    const [pageSize2, setPageSize2] = useState(PAGE_SIZES[0]);
    const [initialRecords2, setInitialRecords2] = useState(sortBy(rowData, 'firstName'));
    const [recordsData2, setRecordsData2] = useState(initialRecords2);

    const [search2, setSearch2] = useState('');
    const [sortStatus2, setSortStatus2] = useState<DataTableSortStatus>({
        columnAccessor: 'firstName',
        direction: 'asc',
    });

    useEffect(() => {
        setPage2(1);
    }, [pageSize2]);

    useEffect(() => {
        const from = (page2 - 1) * pageSize2;
        const to = from + pageSize2;
        setRecordsData2([...initialRecords2.slice(from, to)]);
    }, [page2, pageSize2, initialRecords2]);

    useEffect(() => {
        setInitialRecords2(() => {
            return rowData.filter((item: any) => {
                return (
                    item.firstName.toLowerCase().includes(search2.toLowerCase()) ||
                    item.company.toLowerCase().includes(search2.toLowerCase()) ||
                    item.age.toString().toLowerCase().includes(search2.toLowerCase()) ||
                    item.dob.toLowerCase().includes(search2.toLowerCase()) ||
                    item.email.toLowerCase().includes(search2.toLowerCase()) ||
                    item.phone.toLowerCase().includes(search2.toLowerCase())
                );
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search2]);

    useEffect(() => {
        const data2 = sortBy(initialRecords2, sortStatus2.columnAccessor);
        setInitialRecords2(sortStatus2.direction === 'desc' ? data2.reverse() : data2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus2]);

    const formatDate = (date: string | number | Date) => {
        if (date) {
            const dt = new Date(date);
            const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
            const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
            return day + '/' + month + '/' + dt.getFullYear();
        }
        return '';
    };

    const randomColor = () => {
        const color = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
        const random = Math.floor(Math.random() * color.length);
        return color[random];
    };

    // checking the token

    const gettingToken = () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            navigate('/auth/boxed-signin');
            console.log('Token not found');
        }
    };

    // getting all drivers

    const fetchDrivers = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/driver/filtered`, {
                params: { search }, // Send search query
            });
            setDrivers(response.data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        }
    };
    // getting all providers

    const fetchProviders = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/provider/filtered`, {
                params: { search }, // Send search query
            });
            setProviders(response.data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        }
    };
    // getting all companies

    const fetchCompanies = async (search = '') => {
        try {
            const response = await axios.get(`${backendUrl}/company/filtered`, {
                params: { search }, // Send search query
            });
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        }
    };

    useEffect(() => {
        gettingToken();
        fetchDrivers(searchDriver);
        fetchProviders(searchProviders);
        fetchCompanies(searchCompnies);
    }, [searchDriver, searchProviders, searchCompnies]);

    return (
        <div>
            {![ROLES.VERIFIER].includes(role) && (
                // {/* Driver Table................................................................................ */}
                <div className="panel mt-6">
                    <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                        <h5 className="font-semibold text-lg dark:text-white-light">PMNA Drivers</h5>
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder="Search..." value={searchDriver} onChange={(e) => setSearchDriver(e.target.value)} />
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            className="whitespace-nowrap table-hover"
                            records={drivers} // Set an empty array to clear the table
                            columns={[
                                {
                                    accessor: 'name',
                                    title: 'Name',
                                    render: (driver: Driver) => (
                                        <div className="flex items-center w-max">
                                            <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${driver.image}`} alt="" />
                                            <div>{driver.name}</div>
                                        </div>
                                    ),
                                },
                                { accessor: 'idNumber', title: 'Driver ID', render: (driver: Driver) => <div>{driver.idNumber}</div> },
                                { accessor: 'cashInHand', title: 'Cash in Hand', render: (driver: Driver) => <div>₹{driver.cashInHand ? driver.cashInHand : 0}</div> },
                                {
                                    accessor: 'driverSalary',
                                    title: 'Salary Amount',
                                    render: (driver: Driver) => (
                                        <div>
                                            <div>₹{driver.driverSalary ? driver.driverSalary : 0}</div>
                                        </div>
                                    ),
                                },

                                {
                                    accessor: 'action',
                                    title: 'Action',
                                    titleClassName: '!text-center',
                                    render: (driver: Driver) => (
                                        <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <button type="button" className="btn btn-success px-2 py-1 text-xs" onClick={() => navigate(`/driverreport/${driver._id}`)}>
                                                Cash Report
                                            </button>
                                            <button type="button" className="btn btn-primary px-2 py-1 text-xs" onClick={() => navigate(`/dcpreport/driverreport/salaryreport/${driver._id}`)}>
                                                Salary
                                            </button>
                                            <button type="button" className="btn btn-danger px-2 py-1 text-xs" onClick={() => navigate(`/dcpreport/expence/${driver._id}`)}>
                                                Expense
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
            {![ROLES.VERIFIER].includes(role) && (
                // {/* Provider Table................................................................ */}
                <div className="panel mt-6">
                    <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                        <h5 className="font-semibold text-lg dark:text-white-light">Providers</h5>
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder="Search..." value={searchProviders} onChange={(e) => setSearchProviders(e.target.value)} />
                        </div>
                    </div>
                    <div className="datatables">
                        <DataTable
                            className="whitespace-nowrap table-hover"
                            records={providers} // Set an empty array to clear the table
                            columns={[
                                {
                                    accessor: 'name',
                                    title: 'Name',
                                    render: (provider: Provider) => (
                                        <div className="flex items-center w-max">
                                            <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${provider.image}`} alt="" />
                                            <div>{provider.name}</div>
                                        </div>
                                    ),
                                },
                                { accessor: 'idNumber', title: 'Driver ID', render: (provider: Provider) => <div>{provider.idNumber}</div> },
                                { accessor: 'cashInHand', title: 'Cash in Hand', render: (provider: Provider) => <div>₹{provider.cashInHand ? provider.cashInHand : 0}</div> },
                                {
                                    accessor: 'driverSalary',
                                    title: 'Salary Amount',
                                    render: (provider: Provider) => (
                                        <div>
                                            <div>₹{provider.driverSalary ? provider.driverSalary : 0}</div>
                                        </div>
                                    ),
                                },

                                {
                                    accessor: 'action',
                                    title: 'Action',
                                    titleClassName: '!text-center',
                                    render: (provider: Provider) => (
                                        <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <button type="button" className="btn btn-success px-2 py-1 text-xs" onClick={() => navigate(`/provider-report/${provider._id}`)}>
                                                Cash Report
                                            </button>
                                            <button type="button" className="btn btn-primary px-2 py-1 text-xs">
                                                Salary
                                            </button>
                                            <button type="button" className="btn btn-danger px-2 py-1 text-xs">
                                                Expense
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
            {/* Compnay Table ............................................................................... */}
            <div className="panel mt-6">
                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Companies</h5>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder="Search..." value={searchCompnies} onChange={(e) => setSearchCompanies(e.target.value)} />
                    </div>
                </div>
                <div className="datatables">
                    <DataTable
                        className="whitespace-nowrap table-hover"
                        records={companies} // Set an empty array to clear the table
                        columns={[
                            {
                                accessor: 'name',
                                title: 'Name',
                                render: (company: Company) => (
                                    <div className="flex items-center w-max">
                                        <img className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover" src={`${CLOUD_IMAGE}${company.image}`} alt="" />
                                        <div>{company.name}</div>
                                    </div>
                                ),
                            },
                            { accessor: 'idNumber', title: 'Driver ID', render: (company: Company) => <div>{company.idNumber}</div> },
                            { accessor: 'cashInHand', title: 'Cash in Hand', render: (company: Company) => <div>₹{company.cashInHand ? company.cashInHand : 0}</div> },


                            {
                                accessor: 'action',
                                title: 'Action',
                                titleClassName: '!text-center',
                                render: (company) => (
                                    <div className="relative inline-flex items-center space-x-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button type="button" className="btn btn-success px-2 py-1 text-xs"
                                            onClick={() => navigate(`/company-report/${company._id}`)}
                                        >
                                            Cash Report
                                        </button>
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default MultipleTables;
