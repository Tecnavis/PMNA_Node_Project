import React, { useState, useEffect, Fragment, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import axios, { AxiosError } from 'axios';
import styles from './bookingAdd.module.css';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import Select from 'react-select';
import ShowroomCreate from './ShowroomCreateModal';
import { GiPathDistance } from 'react-icons/gi';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import IconPlus from '../../components/Icon/IconPlus';
import type { Baselocation, Company, Driver, ExtendedBaselocation, Provider, SelectedEntity, ServiceType, Showroom } from './BookingAdd'

const AddBookingWithoutAuth: React.FC = () => {
    // Checking message from openBooking 

    const locationFromOpen = useLocation();
    const params = new URLSearchParams(locationFromOpen.search);
    const message = params.get('message');
    const isMessageTrue = message === 'true';
    if (isMessageTrue) {
        console.log('this is true')
    } else {
        console.log('this is false')
    }


    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const id = useParams();
    const [workType, setWorkType] = useState<string>('');
    const [role, setRole] = useState<string>('');
    const [trappedLocation, setTrappedLocation] = useState<string>('');
    const [PayableAmount, setPayableAmount] = useState<number>(0);
    const [totalDriverDistence, setTotalDriverDistence] = useState<number | null>(null);
    const [afterExpence, setAfterExpence] = useState<number>(0);
    const [updatedAmount, setUpdatedAmout] = useState<number | null>(null);
    const [driverSalary, setDriverSalary] = useState<number | null>(null);
    const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
    const [adjustmentValue, setAdjustmentValue] = useState<number | null>(null);
    const [totalAmount, setTotalAmount] = useState<number | null>(null);
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [pickupDate, setPickupDate] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');
    const [mob1, setMob1] = useState<string>('');
    const [mob2, setMob2] = useState<string>('');
    const [customerVehicleNumber, setCustomerVehicleNumber] = useState<string>('');
    const [brandName, setBrandName] = useState<string>('');
    const [comments, setComments] = useState<string>('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [showrooms, setShowrooms] = useState<Showroom[]>([]);
    const [baseLocations, setBaseLocations] = useState<Baselocation[]>([]);
    const [sortedBaseLocations, setSortedBaseLocations] = useState<ExtendedBaselocation[]>([]);
    const [fileNumber, setFileNumber] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [latitudeAndLongitude, setLatitudeAndLongitude] = useState<string>('');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [modal6, setModal6] = useState(false);
    // -------------------------------------------------------
    const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>({
        name: 'Dummy Driver',
        id: 'dummy',
        payableAmount: PayableAmount,
        afterExpence: afterExpence,
        details: {}, // Provide any default details you need
    });
    const [selectedBaseLocation, setSelectedBaseLocation] = useState<{ id: string; latitudeAndLongitude: string } | null>(null);
    const [selectedShowroom, setSelectedShowroom] = useState<{ id: string; latitudeAndLongitude: string; name: string; insurenceAmount: number | null } | null>(null);
    const [totalDistance, setTotalDistance] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [idNumber, setIdNumber] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [personalPhoneNumber, setPersonalPhoneNumber] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [modal2, setModal2] = useState(false);
    const [serviceCategory, setServiceCategory] = useState<string>('');
    const [accidentOption, setAccidentOption] = useState<string>('');
    const [insuranceAmount, setInsuranceAmount] = useState<string>('');
    const [pickupLat, pickupLng] = latitudeAndLongitude.split(',');
    const [baseLat, baseLng] = selectedBaseLocation?.latitudeAndLongitude ? selectedBaseLocation.latitudeAndLongitude.split(',') : [null, null];
    const [showroomLat, showroomLng] = selectedShowroom?.latitudeAndLongitude ? selectedShowroom.latitudeAndLongitude.split(',') : [null, null];
    const uid = id.id;

    //ref for states 
    const workTypeRef = useRef<HTMLInputElement>(null);
    const totalDistanceRef = useRef<HTMLInputElement>(null);
    const trapedLocationRef = useRef<HTMLInputElement>(null);
    const totalDriverDistenceRef = useRef<HTMLInputElement>(null);
    const mob1Ref = useRef<HTMLInputElement>(null);
    const customerNameRef = useRef<HTMLInputElement>(null);
    const accidentOptionRef = useRef<HTMLInputElement>(null);
    const totalAmountRef = useRef<HTMLInputElement>(null);
    const updatedAmountRef = useRef<HTMLInputElement>(null);
    const serviceCategoryRef = useRef<HTMLInputElement>(null);
    const selectedServiceTypeRef = useRef<HTMLSelectElement>(null);
    const selectedEndityRef = useRef<HTMLInputElement>(null);
    const companyRef = useRef<HTMLSelectElement>(null);
    const fileNumberRef = useRef<HTMLInputElement>(null);
    const locationRef = useRef<HTMLInputElement>(null);
    const latitudeAndLongitudeRef = useRef<HTMLInputElement>(null);
    const baselocationRef = useRef<any>(null);
    const selectedShowroomRef = useRef<any>(null);

    // check the page for token and redirect
    useEffect(() => {
        axios.defaults.headers.common['Authorization'] = `Bearer nothing`;
        setRole('admin');
    }, []);

    // Fetching companies
    const fetchCompanies = async () => {
        try {
            const response = await axios.get(`${backendUrl}/company`);
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching company:', error);
        }
    };

    // handling company
    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const company = companies.find((comp) => comp._id === selectedId) || null;
        setSelectedCompany(company);

    };

    // fetching baselocations
    const fetchBaselocation = async () => {
        try {
            const response = await axios.get(`${backendUrl}/baselocation`);
            setBaseLocations(response.data.data);
        } catch (error) {
            console.error('Error fetching baselocation:', error);
        }
    };

    // Function to generate a unique ID for Payment Work
    const generateFileNumber = () => {
        const uniqueId = `${Date.now()}`;
        return `PMNA-${uniqueId}`;
    };

    // checking work type for condition
    const handleWorkTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedWorkType = e.target.value;
        setSelectedCompany(null);
        setWorkType(selectedWorkType);
        setSelectedEntity(null);

        // Generate file number only for Payment Work
        if (selectedWorkType === 'PaymentWork') {
            setFileNumber(generateFileNumber());
        } else {
            setFileNumber('');
        }
    };

    // calculating the latitude and longitude for the baselocation

    useEffect(() => {
        if (latitudeAndLongitude && baseLocations.length > 0) {
            calculateDistances();
        }
    }, [latitudeAndLongitude, baseLocations]);

    // checking the pickup location and baselocation distance

    const getDistanceAndDuration = async (origin: any, destination: any, id: any) => {
        try {
            const response = await axios.post(`https://api.olamaps.io/routing/v1/directions`, null, {
                params: {
                    origin: `${origin.lat},${origin.lng}`,
                    destination: `${destination.lat},${destination.lng}`,
                    api_key: import.meta.env.VITE_REACT_APP_API_KEY,
                },
            });

            // Extract distance from the correct path
            const distance = response.data.routes[0]?.legs[0]?.distance;

            return { id, distance: distance / 1000 }; // Convert to km if needed
        } catch (error) {
            console.error('Error fetching distance:', error);
            return { id, distance: null };
        }
    };

    const calculateDistances = async () => {
        const originCoords = latitudeAndLongitude.split(',').map(Number);
        const origin = { lat: originCoords[0], lng: originCoords[1] };

        const distancePromises = baseLocations.map(async (location) => {
            const destinationCoords = location.latitudeAndLongitude.split(',').map(Number);
            const destination = { lat: destinationCoords[0], lng: destinationCoords[1] };
            return await getDistanceAndDuration(origin, destination, location._id);
        });

        const distances = await Promise.all(distancePromises);

        const sortedLocations = baseLocations
            .map((location) => {
                const matchedDistance = distances.find((d) => d.id === location._id);
                return {
                    ...location,
                    distance: matchedDistance?.distance ?? Number.MAX_SAFE_INTEGER, // Fallback for missing distance
                };
            })
            .sort((a, b) => a.distance - b.distance);

        setSortedBaseLocations(sortedLocations);
    };

    // fetching all showrooms
    const fetchShowroom = async () => {
        try {
            const response = await axios.get(`${backendUrl}/showroom`);
            setShowrooms(response.data);
        } catch (error) {
            console.error('Error fetching showrooms:', error);
        }
    };

    //handle open modal for creating showroom
    const handleOpenModal = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setModal2(true);
    };

    //handle close modal for creating showroom
    const handleCloseModal = async () => {
        setModal2(false);
        fetchShowroom();
    };

    // handling the input for the change dropoff location
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedName = e.target.value;

        setSelectedShowroom((prev) => (prev ? { ...prev, name: updatedName } : { id: '', latitudeAndLongitude: '', name: updatedName, insurenceAmount: null }));
    };

    // handling the input for the change dropoff latitude and longitude
    const handleLatitudeAndLongitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedValue = e.target.value;

        setSelectedShowroom((prev) => (prev ? { ...prev, latitudeAndLongitude: updatedValue } : { id: '', latitudeAndLongitude: updatedValue, name: '', insurenceAmount: null }));
    };

    //   handling the traped location
    const handleTrappedLocationChange = (e: any) => {
        setSelectedServiceType(null);
        setSelectedEntity(null);
        setAdjustmentValue(null);
        setInsuranceAmount('');
        setUpdatedAmout(null);
        setTrappedLocation(e.target.value);
    };

    // getting service types
    const fetchServiceTypes = async () => {
        try {
            const response = await axios.get(`${backendUrl}/serviceType`);
            setServiceTypes(response.data);
        } catch (error) {
            console.error('Error fetching service types:', error);
        }
    };

    // handling the servicetype
    const handleServiceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const serviceTypeId = e.target.value;
        const selectedService = serviceTypes.find((item) => item._id === serviceTypeId);

        setSelectedEntity(null);

        if (selectedService) {
            setSelectedServiceType(selectedService);
            fetchAndFilterDrivers(serviceTypeId);
            fetchAndFilterProviders(serviceTypeId);
        }
    };

    // Fetch drivers and apply filter
    const fetchAndFilterDrivers = async (serviceTypeId: any) => {
        try {
            const response = await axios.get(`${backendUrl}/driver`);
            const allDrivers = response.data;
            const filteredDrivers = allDrivers.filter((driver: any) => driver.vehicle.some((vehicle: any) => vehicle.serviceType._id === serviceTypeId._id));
            setDrivers(filteredDrivers);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    // Fetch providers and apply filter
    const fetchAndFilterProviders = async (serviceTypeId: any) => {
        try {
            const response = await axios.get(`${backendUrl}/provider`);
            const allProviders = response.data;
            const filteredProviders = allProviders.filter((provider: any) => provider.serviceDetails.some((center: any) => center.serviceType._id === serviceTypeId._id));
            setProviders(filteredProviders);
        } catch (error) {
            console.error('Error fetching providers:', error);
        }
    };

    // opening modal for selecting driver and provider

    const openDriverModal = async () => {
        setModal6(true);
        // calulating the payable and expence amount (payment work)

        if (!selectedCompany) {
            const kilometerLessed = parseFloat(totalDistance) - (selectedServiceType?.firstKilometer || 0);
            const lessedAmt = kilometerLessed * (selectedServiceType?.additionalAmount || 0);
            const PayableAmount = lessedAmt + (selectedServiceType?.firstKilometerAmount || 0);
            const totalExpence = parseFloat(totalDistance) * (selectedServiceType?.expensePerKm || 0);
            const afterExpence = PayableAmount - totalExpence;
            setPayableAmount(PayableAmount);
            setAfterExpence(afterExpence);
        } else {
            const getServiceType = selectedCompany.vehicle.find((vehicle) => vehicle.serviceType && vehicle.serviceType._id === selectedServiceType?._id);
            const kilometerLessed = parseFloat(totalDistance) - (getServiceType?.kmForBasicAmount || 0);
            const lessedAmt = kilometerLessed * (getServiceType?.overRideCharge || 0);
            const PayableAmount = lessedAmt + (getServiceType?.basicAmount || 0);
            const totalExpence = parseFloat(totalDistance) * (selectedServiceType?.expensePerKm || 0);
            const afterExpence = PayableAmount - totalExpence;
            setPayableAmount(PayableAmount);
            setAfterExpence(afterExpence);
        }
    };

    // closing modal for selecting driver and provider

    const closeDriverModal = async () => {
        setModal6(false);
    };

    const handleSelect = (entity: any) => {
        if (entity.vehicle) {
            // Entity is a driver
            setSelectedEntity({
                name: entity.name,
                id: entity._id, // Only storing the ID part
                payableAmount: PayableAmount,
                afterExpence: afterExpence,
                details: entity.vehicle, // Setting vehicle details
            });
        } else if (entity.serviceDetails) {
            // Entity is a provider
            setSelectedEntity({
                name: entity.name,
                id: entity._id, // Only storing the ID part
                payableAmount: PayableAmount,
                afterExpence: afterExpence,
                details: entity.serviceDetails, // Setting service details
            });
        }
        setModal6(false);
    };

    // handling the servie category

    const handleServiceCategoryChange = (e: any) => {
        const selectedCategory = e.target.value;
        setServiceCategory(selectedCategory);

        // Reset accident-specific states if the selected category is not 'accident'
        if (selectedCategory !== 'accident') {
            setAccidentOption('');
            setInsuranceAmount('');
        }
    };

    // handling set accident amount

    const handleAccidentOptionChange = (e: any) => {
        const selectedOption = e.target.value;
        setAccidentOption(selectedOption);

        if (selectedOption === 'insurance' && selectedShowroom) {
            // Set the insuranceAmount of the selected showroom
            setInsuranceAmount(selectedShowroom.insurenceAmount?.toString() || '');
        } else {
            // Reset insuranceAmount if the selected accident option is not 'insurance'
            setInsuranceAmount('');
        }
    };

    // calculating total amount
    useEffect(() => {
        // Calculate the payable amount with insurance
        if (!adjustmentValue) {
            if (selectedEntity?.payableAmount) {
                const payableWithInsurance = selectedEntity.payableAmount - parseFloat(insuranceAmount || '0');
                setTotalAmount(payableWithInsurance);
            } else {
                setTotalAmount(0); // Set to 0 if no payableAmount is available
            }
        }


    }, [selectedEntity, insuranceAmount]);

    // handling the selected vehicle type

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedVehicleType(event.target.value);
    };

    // for to day date
    const now = new Date();
    const today = now.toISOString().slice(0, 16);

    // to adjustment value

    const handleAdjustment = () => {
        // Check if selectedEntity is null before accessing its properties
        if (selectedEntity === null) {
            // Handle the case where selectedEntity is null, e.g., show an error or return early
            console.error('Selected entity is null.');
            return;
        }

        // Check if totalAmount is null before performing operations on it
        if (totalAmount === null) {
            // Handle the case where totalAmount is null, e.g., show an error or return early
            console.error('Total amount is null.');
            return;
        }

        if (adjustmentValue === null) {
            const payableWithInsurance = (selectedEntity?.payableAmount ?? 0) - parseFloat(insuranceAmount || '0');
            setTotalAmount(payableWithInsurance);
        } else if (adjustmentValue > totalAmount) {
            // If the adjustmentValue is greater than totalAmount, set the adjustmentAmount to adjustmentValue
            setTotalAmount(adjustmentValue);
        } else {
            // If the adjustmentValue is less than totalAmount, ask for confirmation
            setConfirmationVisible(true);
        }
    };

    // handling the baselocation

    const options = sortedBaseLocations.map((location) => ({
        value: location._id,
        label: `${location.baseLocation.charAt(0).toUpperCase() + location.baseLocation.slice(1)} - ${location.distance !== Number.MAX_SAFE_INTEGER ? `${location.distance.toFixed(2)} km` : 'Distance Unavailable'
            }`,
        latitudeAndLongitude: location.latitudeAndLongitude,
    }));

    const handleChangeBaseLocation = (selectedOption: any) => {
        if (selectedOption) {
            setSelectedBaseLocation({
                id: selectedOption.value,
                latitudeAndLongitude: selectedOption.latitudeAndLongitude,
            });
        } else {
            setSelectedBaseLocation(null); // Reset if no option is selected
        }
    };

    // handling showroom

    const showroomOptions = showrooms.map((showroom) => ({
        value: showroom._id,
        label: showroom.name.charAt(0).toUpperCase() + showroom.name.slice(1),
        latitudeAndLongitude: showroom.latitudeAndLongitude,
        insurenceAmount: showroom.services.bodyShop.amount,
        name: showroom.name,
    }));

    const handleChangeShowroom = (selectedOption: any) => {
        if (selectedOption) {
            setSelectedShowroom({
                id: selectedOption.value,
                latitudeAndLongitude: selectedOption.latitudeAndLongitude,
                name: selectedOption.name,
                insurenceAmount: selectedOption.insurenceAmount,
            });
        } else {
            setSelectedShowroom(null); // Reset if no option is selected
        }
    };

    // calculating the drive salary

    const calculateDriverSalary = () => {
        if (!selectedEntity || !selectedServiceType || totalDriverDistence === null) {
            console.error('Missing data for calculation');
            return;
        }

        const matchingService = Array.isArray(selectedEntity.details)
            ? selectedEntity.details.find((detail: any) => detail.serviceType._id === selectedServiceType._id)
            : null; // Or handle the case where it's not an array (e.g., provide a fallback)

        if (!matchingService) {
            console.error('No matching service type found');
            return;
        }

        const { basicAmount, kmForBasicAmount, overRideCharge } = matchingService;

        const extraDistance = Math.max(0, totalDriverDistence - kmForBasicAmount);
        const additionalCharge = extraDistance * overRideCharge;
        const calculatedSalary = basicAmount + additionalCharge;

        setDriverSalary(calculatedSalary);
    };

    const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value ? parseFloat(e.target.value) : null;
        setTotalDriverDistence(value);
        calculateDriverSalary();
    };

    useEffect(() => {
        if (totalDriverDistence !== null && selectedServiceType) {
            calculateDriverSalary();
        }
    }, [totalDriverDistence, selectedServiceType, selectedEntity]);

    // updating the amount if the traped location is out side of the road

    useEffect(() => {
        if (trappedLocation === 'outsideOfRoad' && updatedAmount !== null) {
            setTotalAmount(updatedAmount);
        }
    }, [trappedLocation, updatedAmount]);
    useEffect(() => {
        setSelectedEntity({
            name: 'Dummy Driver',
            id: 'dummy',
            payableAmount: PayableAmount,
            afterExpence: afterExpence,
            details: {}, // Provide any default details you need
        });
    }, []);

    // handle create booking

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            // -----------------------------------------
            const data = {
                workType: workType || "",
                pickupDate: pickupDate || "",
                company: selectedCompany?._id ?? '',
                fileNumber: fileNumber || "",
                location: location || "",
                latitudeAndLongitude: latitudeAndLongitude || "",
                baselocation: selectedBaseLocation?.id ?? '',
                showroom: selectedShowroom?.id ?? '',
                totalDistence: totalDistance || "",
                dropoffLocation: selectedShowroom?.name ?? '',
                dropoffLatitudeAndLongitude: selectedShowroom?.latitudeAndLongitude ?? '',
                trapedLocation: trappedLocation || "",
                updatedAmount: updatedAmount?.toString() ?? '',
                serviceType: selectedServiceType?._id ?? '',
                driver: selectedEntity && drivers.some((driver) => driver._id === selectedEntity.id) ? selectedEntity.id : undefined,
                provider: selectedEntity && providers.some((provider) => provider._id === selectedEntity.id) ? selectedEntity.id : undefined,
                payableAmountForDriver: selectedEntity && drivers.some((driver) => driver._id === selectedEntity.id) ? selectedEntity.payableAmount : undefined,
                payableAmountForProvider: selectedEntity && providers.some((provider) => provider._id === selectedEntity.id) ? selectedEntity.payableAmount : undefined,
                afterExpenseForDriver: selectedEntity && drivers.some((driver) => driver._id === selectedEntity.id) ? selectedEntity.afterExpence : undefined,
                afterExpenseForProvider: selectedEntity && providers.some((provider) => provider._id === selectedEntity.id) ? selectedEntity.afterExpence : undefined,
                pickupDistence: 'not defined',
                serviceCategory: serviceCategory || "",
                accidentOption: accidentOption || "",
                insuranceAmount: insuranceAmount || "",
                adjustmentValue: adjustmentValue?.toString() ?? '',
                amountWithoutInsurence: selectedEntity?.payableAmount?.toString() ?? '',
                totalAmount: totalAmount?.toString() ?? '',
                totalDriverDistence: totalDriverDistence?.toString() ?? '',
                driverSalary: driverSalary?.toString() ?? '',
                customerName: customerName || "",
                mob1: mob1 || "",
                mob2: mob2 || "",
                customerVehicleNumber: customerVehicleNumber || "",
                vehicleType: selectedVehicleType || "",
                brandName: brandName || "",
                comments: comments || "",
                status: 'Booking Added',
                bookedBy: `RSA-${role} `,
            };

            setLoading(true);

            try {
                const response = await axios.post(`${backendUrl}/booking/no-auth`, data, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.status === 400 || response.status === 401) {
                    Swal.fire({
                        icon: 'warning',
                        title: response.data.message,
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Booking added successfully',
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });
                }
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    const errorMessage = error.response?.data?.message || 'An error occurred';
                    console.error('Error creating booking:', errorMessage);

                    Swal.fire({
                        icon: 'error',
                        title: 'Booking Failed',
                        text: errorMessage,
                        toast: true,
                        position: 'top',
                        showConfirmButton: false,
                        timer: 3000,
                        padding: '10px 20px',
                    });

                    setErrors(error.response?.data || {});
                } else {
                    console.error('Unexpected error:', error);
                    setErrors({ message: 'An unexpected error occurred' });
                }
            } finally {
                setLoading(false);
            }
        }
    }
    // getting booking by id
    useEffect(() => {
        if (!uid) {
            console.error('ID is missing or invalid');
            return;
        }


        const fetchBookingById = async () => {
            try {
                const response = await axios.get(`${backendUrl}/booking/${uid}`);
                const data = response.data;


                // Set fields with fallback values
                setWorkType(data.workType || '');
                setPickupDate(data.pickupDate || '');
                setSelectedCompany(data.company || null);
                setFileNumber(data.fileNumber || '');
                setLocation(data.location || '');
                setLatitudeAndLongitude(data.latitudeAndLongitude || '');
                setSelectedBaseLocation((prev) => {
                    const baseLocationData = {
                        id: data.baselocation._id,
                        latitudeAndLongitude: data.baselocation.latitudeAndLongitude
                    }
                    return prev ? { ...prev, ...baseLocationData } : baseLocationData;
                })
                setTotalDistance(data.totalDistance || ''); // Fixed typo in `totalDistance`
                // Update selected showroom state
                setSelectedShowroom((prev) => {
                    const showroomData = {
                        id: data.showroom._id || '', // Safe access using optional chaining
                        latitudeAndLongitude: data.dropoffLatitudeAndLongitude || '',
                        name: data.dropoffLocation || prev?.name || '', // Retain existing name if not provided
                        insurenceAmount: data.showroom?.services?.bodyShop?.amount, // Ensure the property name matches the expected type
                    };


                    return prev ? { ...prev, ...showroomData } : showroomData;
                });
                setTrappedLocation(data.trapedLocation || '');
                setUpdatedAmout(data.updatedAmount || '');
                setSelectedServiceType(data.serviceType || '');

                if (data.driver) {
                    setSelectedEntity({ id: data.driver._id, payableAmount: data.payableAmountForDriver, name: data.driver?.name });
                } else if (data.provider) {
                    setSelectedEntity({ id: data.provider._id, payableAmount: data.payableAmountForProvider, name: data.provider?.name });
                } else {
                    setSelectedEntity(null);
                }
                setServiceCategory(data.serviceCategory || '');
                setAccidentOption(data.accidentOption || '');
                setInsuranceAmount(data.insuranceAmount || '');
                setTotalDistance(data.totalDistence || '');
                setTrappedLocation(data.trapedLocation || '');
                setUpdatedAmout(data.updatedAmount || '');
                setServiceCategory(data.serviceCategory || '');
                setAdjustmentValue(data.adjustmentValue || '');
                if (data.adjustmentValue) {
                    setTotalAmount(data.adjustmentValue || '');
                } else {
                    setTotalAmount(data.totalAmount || '');
                }
                setTotalDriverDistence(data.totalDriverDistence || '');
                setDriverSalary(data.driverSalary || '');
                setCustomerName(data.customerName || '');
                setMob1(data.mob1 || '');
                setMob2(data.mob2 || '');
                setCustomerVehicleNumber(data.customerVehicleNumber || '');
                setSelectedVehicleType(data.vehicleType || '');
                setBrandName(data.brandName || '');
                setComments(data.comments || '');
                setComments(data.comments || '');


            } catch (error) {
                console.error('Error fetching booking data:', error);
            }
        };

        fetchBookingById();
    }, [uid]);
    // handling edit

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            const data = {
                workType: workType,
                pickupDate: pickupDate,
                company: selectedCompany?._id ?? '',
                fileNumber: fileNumber,
                location: location,
                latitudeAndLongitude: latitudeAndLongitude,
                baselocation: selectedBaseLocation?.id ?? '',
                showroom: selectedShowroom?.id ?? '',
                totalDistence: totalDistance,
                dropoffLocation: selectedShowroom?.name ?? '',
                dropoffLatitudeAndLongitude: selectedShowroom?.latitudeAndLongitude ?? '',
                trapedLocation: trappedLocation,
                updatedAmount: updatedAmount?.toString() ?? '',
                serviceType: selectedServiceType?._id ?? '',
                driver: selectedEntity && drivers.some((driver) => driver._id === selectedEntity.id) ? selectedEntity.id : undefined,
                provider: selectedEntity && providers.some((provider) => provider._id === selectedEntity.id) ? selectedEntity.id : undefined,
                payableAmountForDriver: selectedEntity && drivers.some((driver) => driver._id === selectedEntity.id) ? selectedEntity.payableAmount : undefined,
                payableAmountForProvider: selectedEntity && providers.some((provider) => provider._id === selectedEntity.id) ? selectedEntity.payableAmount : undefined,
                afterExpenseForDriver: selectedEntity && drivers.some((driver) => driver._id === selectedEntity.id) ? selectedEntity.afterExpence : undefined,
                afterExpenseForProvider: selectedEntity && providers.some((provider) => provider._id === selectedEntity.id) ? selectedEntity.afterExpence : undefined,
                pickupDistence: 'not defined',
                serviceCategory: serviceCategory,
                accidentOption: accidentOption,
                insuranceAmount: insuranceAmount,
                adjustmentValue: adjustmentValue?.toString() ?? '',
                amountWithoutInsurence: selectedEntity?.payableAmount?.toString() ?? '',
                totalAmount: totalAmount?.toString() ?? '',
                totalDriverDistence: totalDriverDistence?.toString() ?? '',
                driverSalary: driverSalary?.toString() ?? '',
                customerName: customerName,
                mob1: mob1,
                mob2: mob2,
                customerVehicleNumber: customerVehicleNumber,
                vehicleType: selectedVehicleType,
                brandName: brandName,
                comments: comments,
                bookedBy: `RSA-${role} `,
            };

            setLoading(true);

            try {
                const response = await axios.put(`${backendUrl}/booking/${uid}`, data, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Booking updated successfully',
                    toast: true,
                    position: 'top',
                    showConfirmButton: false,
                    timer: 3000,
                    padding: '10px 20px',
                });
            } catch (error: unknown) {
                if (error instanceof AxiosError) {
                    console.error('Error creating booking:', error.response?.data?.message || error.message);
                    setErrors(error.response?.data || {});
                } else if (error instanceof Error) {
                    console.error('Error creating booking:', error.message);
                    setErrors({ message: error.message });
                } else {
                    console.error('Unexpected error:', error);
                    setErrors({ message: 'An unexpected error occurred' });
                }
            } finally {
                setLoading(false);
            }
        }
    };

    // validation for add or update driver

    const validate = (): boolean => {
        const formErrors: Record<string, string> = {};

        // Set errors in the state
        setErrors(formErrors);

        return Object.keys(formErrors).length === 0;
    };
    // ref to scrolling 

    useEffect(() => {
        fetchCompanies();
        fetchBaselocation();
        fetchShowroom();
        fetchServiceTypes();

        if (selectedServiceType) {
            fetchAndFilterDrivers(selectedServiceType);
            fetchAndFilterProviders(selectedServiceType);
        }
    }, [selectedServiceType]); // Add selectedServiceType to dependencies

    return (
        <div>
            <form autoComplete="off" className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h6 className="text-lg font-bold mb-5">Booking</h6>
                </div>
                <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* work type radio button  */}
                        <div>
                            <label>Work Type</label>
                            <div className="flex items-center space-x-4">
                                <label htmlFor="rsa-work">
                                    <input id="rsa-work" type="radio" name="workType" ref={workTypeRef} value="RSAWork" className="form-radio" checked={workType === 'RSAWork'} onChange={handleWorkTypeChange} />
                                    RSA Work
                                </label>
                                <label htmlFor="payment-work">
                                    <input
                                        id="payment-work"
                                        type="radio"
                                        name="workType"
                                        value="PaymentWork"
                                        className="form-radio"
                                        checked={workType === 'PaymentWork'}
                                        onChange={handleWorkTypeChange}
                                    />
                                    Payment Work
                                </label>
                            </div>
                            {errors.workType && <p className="text-red-500">{errors.workType}</p>}
                        </div>
                        {/* pickup date (optional)  */}
                        <div>
                            <label htmlFor="pickupDate">
                                Pickup Date <span style={{ color: 'red' }}>(optional)</span>
                            </label>
                            <input id="date-time" min={today} type="datetime-local" className="form-input" value={pickupDate ? new Date(pickupDate).toISOString().slice(0, 16) : ''} onChange={(e) => setPickupDate(e.target.value)} />{' '}
                        </div>
                        {/* selcect company if the work type is RSAWork  */}
                        {workType === 'RSAWork' && (
                            <div>
                                <label htmlFor="company-select">Choose a Company</label>
                                <select id="company-select" className="form-select" ref={companyRef} value={selectedCompany?._id || ''} onChange={handleCompanyChange}>
                                    <option value="" disabled>
                                        -- Select a company --
                                    </option>
                                    {companies.map((company, index) => (
                                        <option key={index} value={company._id}>
                                            {company.name.charAt(0).toLocaleUpperCase() + company.name.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                {errors.selectedCompany && <p className="text-red-500">{errors.selectedCompany}</p>}
                            </div>
                        )}
                        {/* File number  */}
                        <div className="mt-4">
                            <label htmlFor="file-number" className="block font-medium">
                                File Number
                            </label>
                            <input
                                id="file-number"
                                type="text"
                                placeholder="Enter File Number"
                                ref={fileNumberRef}
                                autoComplete="off"
                                className="form-input"
                                value={fileNumber}
                                readOnly={workType === 'PaymentWork'}
                                onChange={(e) => setFileNumber(e.target.value)}
                            />
                            {errors.fileNumber && <p className="text-red-500">{errors.fileNumber}</p>}
                        </div>
                        {/* Location  */}
                        <div className={styles.container}>
                            <label htmlFor="location">Location</label>
                            <div className={styles.inputContainer}>
                                <input
                                    id="serviceName"
                                    type="text"
                                    autoComplete="off"
                                    ref={locationRef}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className={styles.input}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                />
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                    Search
                                </a>
                            </div>
                            {errors.location && <p className="text-red-500">{errors.location}</p>}
                        </div>
                        {/* latitude and longitude  */}
                        <div>
                            <label htmlFor="latitudeAndLongitude">Latitude and Longitude</label>
                            <input
                                id="latitudeAndLongitude"
                                type="text"
                                placeholder="Enter Latitude and longitude"
                                className="form-input"
                                ref={latitudeAndLongitudeRef}
                                autoComplete="off"
                                value={latitudeAndLongitude}
                                onChange={(e) => setLatitudeAndLongitude(e.target.value)}
                            />
                            {errors.latitudeAndLongitude && <p className="text-red-500">{errors.latitudeAndLongitude}</p>}
                        </div>
                        {/* select start location (baselocation) */}
                        <div>
                            <label htmlFor="base-location-select" style={{ display: 'block', marginBottom: '8px' }}>
                                Choose Start Location
                            </label>
                            <Select
                                id="base-location-select"
                                options={options}
                                ref={baselocationRef}
                                onChange={handleChangeBaseLocation}
                                value={selectedBaseLocation ? options.find((option) => option.value === selectedBaseLocation.id) : null}
                                placeholder="Select a base location..."
                                isSearchable={true} // Enables search functionality
                            />
                            {errors.selectedBaseLocation && <p className="text-red-500">{errors.selectedBaseLocation}</p>}
                        </div>
                        {/* all showrooms */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', justifyContent: 'center' }}>
                                <div style={{ flex: '1' }}>
                                    <label htmlFor="service-center-select" style={{ display: 'block', marginBottom: '8px' }}>
                                        Choose Service Center
                                    </label>
                                    <Select
                                        id="service-center-select"
                                        options={showroomOptions}
                                        ref={selectedShowroomRef}
                                        onChange={handleChangeShowroom}
                                        value={selectedShowroom ? showroomOptions.find((option) => option.value === selectedShowroom.id) : null}
                                        placeholder="Select a service center..."
                                        isSearchable={true} // Enables search functionality
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                                    <button className="btn btn-success" onClick={handleOpenModal}>
                                        Create Showroom
                                    </button>
                                </div>
                            </div>
                            {errors.selectedShowroom && <p className="text-red-500">{errors.selectedShowroom}</p>}
                        </div>

                        {/* Total distance  */}
                        <div>
                            <label htmlFor="totalDistance">Total distance (KM)</label>
                            <div className="flex">
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&origin=${baseLat},${baseLng}&destination=${baseLat},${baseLng}&waypoints=${pickupLat},${pickupLng}|${showroomLat},${showroomLng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-info ltr:rounded-r-none rtl:rounded-l-none"
                                >
                                    <GiPathDistance size={20} />
                                </a>
                                <input
                                    id="totalDistance"
                                    type="number"
                                    ref={totalDistanceRef}
                                    onChange={(e) => setTotalDistance(e.target.value)}
                                    value={totalDistance}
                                    placeholder="Enter total distance"
                                    onWheel={(e) => e.preventDefault()}
                                    className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                />
                            </div>
                            {errors.totalDistance && <p className="text-red-500">{errors.totalDistance}</p>}
                        </div>
                        {/* dropoff location  */}
                        <div>
                            <label htmlFor="dropofflocation">Dropoff location</label>
                            <div className="flex">
                                <input
                                    id="dropoffLocation"
                                    type="text"
                                    placeholder=""
                                    className="form-input ltr:rounded-r-none rtl:rounded-l-none"
                                    value={selectedShowroom?.name}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (selectedShowroom?.name) {
                                                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedShowroom.name)}`, '_blank', 'noopener,noreferrer');
                                            } else {
                                                console.warn('Showroom name is not available.');
                                            }
                                        }
                                    }}
                                />
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedShowroom?.name ?? 'Default Location')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary ltr:rounded-l-none rtl:rounded-r-none"
                                >
                                    search
                                </a>
                            </div>
                        </div>
                        {/* latitude and longitude for the dropoff location  */}
                        <div>
                            <label htmlFor="latitudeAndLongitude">Dropoff Latitude and Longitude</label>
                            <input
                                id="latitudeAndLongitude"
                                type="text"
                                placeholder="Enter Latitude and longitude"
                                className="form-input"
                                autoComplete="off"
                                value={selectedShowroom?.latitudeAndLongitude}
                                onChange={handleLatitudeAndLongitudeChange}
                            />
                        </div>
                        {/* traped location  */}
                        <div>
                            <p>Trapped Location</p>
                            <label>
                                <input type="radio" ref={trapedLocationRef} name="trappedLocation" value="onRoad" className="form-radio" checked={trappedLocation === 'onRoad'} onChange={handleTrappedLocationChange} />
                                On Road
                            </label>
                            <label>
                                <input type="radio" ref={trapedLocationRef} name="trappedLocation" value="inHouse" className="form-radio" checked={trappedLocation === 'inHouse'} onChange={handleTrappedLocationChange} />
                                In House
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="trappedLocation"
                                    value="outsideOfRoad"
                                    ref={trapedLocationRef}
                                    className="form-radio"
                                    checked={trappedLocation === 'outsideOfRoad'}
                                    onChange={handleTrappedLocationChange}
                                />
                                <span style={{ color: 'red' }}>Outside of the Road</span>
                            </label>
                            {errors.trappedLocation && <p className="text-red-500">{errors.trappedLocation}</p>}
                        </div>
                        {/* adjust value for the  outside of the road  */}
                        {trappedLocation === 'outsideOfRoad' && (
                            <div>
                                <label htmlFor="outsideRoadDetails">Update Amount</label>
                                <input
                                    id="updatedAmount"
                                    type="number"
                                    onWheel={(e) => e.preventDefault()}
                                    placeholder="Enter updated amount"
                                    className="form-input"
                                    ref={updatedAmountRef}
                                    autoComplete="off"
                                    value={updatedAmount ?? ''}
                                    onChange={(e) => setUpdatedAmout(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                                {errors.updatedAmount && <p className="text-red-500">{errors.updatedAmount}</p>}
                            </div>
                        )}
                        {/* maping service type */}
                        {trappedLocation !== 'outsideOfRoad' && (
                            <div>
                                <div style={{ flex: '1' }}>
                                    <label htmlFor="serviceType">Choose service type</label>
                                    <select id="serviceType" className="form-select" ref={selectedServiceTypeRef} value={selectedServiceType?._id || ''} onChange={handleServiceTypeChange}>
                                        <option value="" disabled>
                                            -- Select a service type --
                                        </option>
                                        {serviceTypes.map((item) => (
                                            <option key={item._id} value={item._id}>
                                                {item.serviceName.charAt(0).toUpperCase() + item.serviceName.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.selectedServiceType && <p className="text-red-500">{errors.selectedServiceType}</p>}

                                <div style={{ flex: '1' }}>
                                    <button
                                        type="button"
                                        className={`btn w-full mt-2 ${selectedEntity ? 'btn-success' : 'btn-primary'}`}
                                        onClick={openDriverModal}
                                    >
                                        {selectedEntity && selectedEntity.name ? (
                                            <p ref={selectedEndityRef}>{selectedEntity.name}</p>
                                        ) : (
                                            <p>Select Driver</p>
                                        )}
                                    </button>

                                </div>
                                {errors.selectedEntity && <p className="text-red-500">{errors.selectedEntity}</p>}
                            </div>
                        )}

                        {/* service type  */}

                        {/* Service Type Radio Buttons */}
                    </div>
                </div>
                {selectedEntity && (
                    <div className={`${styles.serviceCategory} my-4`}>
                        <label>Service Category</label>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="serviceType"
                                    className="form-radio"
                                    ref={serviceCategoryRef}
                                    value="serviceCenter"
                                    checked={serviceCategory === 'serviceCenter'}
                                    onChange={handleServiceCategoryChange}
                                />
                                Service Center
                            </label>
                            <label>
                                <input type="radio" ref={serviceCategoryRef} name="serviceType" className="form-radio" value="accident" checked={serviceCategory === 'accident'} onChange={handleServiceCategoryChange} />
                                Accident
                            </label>
                            {/* Accident Options */}
                            <div className="ml-3">
                                {serviceCategory === 'accident' && (
                                    <div style={{ background: '#9a9996', borderRadius: '10px', padding: '10px' }}>
                                        <label>Accident Options</label>
                                        <div>
                                            <label>
                                                <input
                                                    type="radio"
                                                    name="accidentOption"
                                                    className="form-radio"
                                                    ref={accidentOptionRef}
                                                    value="insurance"
                                                    checked={accidentOption === 'insurance'}
                                                    onChange={handleAccidentOptionChange}
                                                />
                                                Insurance
                                            </label>

                                            <label>
                                                <input
                                                    type="radio"
                                                    className="form-radio"
                                                    name="accidentOption"
                                                    value="readyPayment"
                                                    checked={accidentOption === 'readyPayment'}
                                                    onChange={handleAccidentOptionChange}
                                                />
                                                Ready Payment
                                            </label>
                                            <label>
                                                <input
                                                    type="radio"
                                                    className="form-radio"
                                                    name="accidentOption"
                                                    value="both"
                                                    checked={accidentOption === 'both'}
                                                    onChange={handleAccidentOptionChange}
                                                />
                                                Both
                                            </label>
                                            {/* Insurance Amount Input */}
                                            {accidentOption === 'both' && (
                                                <div className="ml-3" style={{ background: '#ffbe91', borderRadius: '10px', padding: '10px' }}>
                                                    <label htmlFor="insuranceAmount">Insurance Amount</label>
                                                    <input
                                                        style={{ width: '210px' }}
                                                        id="insuranceAmount"
                                                        type="number"
                                                        onWheel={(e) => e.preventDefault()}
                                                        placeholder="Enter Insurance Amount"
                                                        className="form-input"
                                                        value={insuranceAmount}
                                                        onChange={(e) => setInsuranceAmount(e.target.value)}
                                                    />
                                                    {errors.insuranceAmount && <p className="text-red-500">{errors.insuranceAmount}</p>}
                                                </div>
                                            )}
                                            {errors.accidentOption && <p className="text-red-500">{errors.accidentOption}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <label>
                                <input type="radio" name="serviceType" ref={serviceCategoryRef} className="form-radio" value="showroom" checked={serviceCategory === 'showroom'} onChange={handleServiceCategoryChange} />
                                Showroom
                            </label>
                            <label>
                                <input type="radio" ref={serviceCategoryRef} className="form-radio" name="serviceType" value="lifting" checked={serviceCategory === 'lifting'} onChange={handleServiceCategoryChange} />
                                Lifting
                            </label>
                            {errors.serviceCategory && <p className="text-red-500">{errors.serviceCategory}</p>}
                        </div>

                        <div className={styles.adustmentDiv}>
                            <h2 className="text-danger" style={{ fontSize: 'large', fontWeight: '600' }}>
                                Adjustment Value
                            </h2>
                            <input
                                id="adjustmentValue"
                                type="number"
                                className="form-input"
                                onWheel={(e) => e.preventDefault()}
                                value={adjustmentValue ?? ''}
                                onChange={(e) => setAdjustmentValue(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                            <button type="button" className="btn btn-success" onClick={handleAdjustment}>
                                Apply
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                            <div>
                                <p>Total amount without insurance</p> <h4 style={{ fontSize: 'x-large' }}>₹{selectedEntity?.payableAmount}</h4>
                            </div>
                            <div>
                                <p> Insurence amount</p> <h4 style={{ fontSize: 'x-large' }}>₹{insuranceAmount}</h4>
                            </div>
                            <div>
                                <p ref={totalAmountRef}>Payable Amount (with insurance)</p> <h4 style={{ fontSize: 'x-large', color: 'blue' }}> ₹{totalAmount !== null ? totalAmount : 0}</h4>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row mt-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {trappedLocation !== 'outsideOfRoad' && (
                            <div>
                                <label htmlFor="totalDriverDistence">Total Driver Distence</label>
                                <input
                                    id="totalDriverDistence"
                                    type="number"
                                    ref={totalDriverDistenceRef}
                                    onWheel={(e) => e.preventDefault()}
                                    placeholder="Enter Total driver distence"
                                    className="form-input"
                                    value={totalDriverDistence ?? ''}
                                    onChange={handleDistanceChange}
                                />
                                {errors.totalDriverDistence && <p className="text-red-500">{errors.totalDriverDistence}</p>}
                            </div>
                        )}
                        {totalDriverDistence && (
                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '7px' }}>
                                <h2 style={{ fontSize: 'x-large' }}>
                                    Driver salary is :<span style={{ marginLeft: '10px' }}>₹{driverSalary}</span>
                                </h2>
                            </div>
                        )}
                        <div>
                            <label htmlFor="customerName">Customer Name</label>
                            <input id="customerName" ref={customerNameRef} type="text" placeholder="Enter customer name" className="form-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                            {errors.customerName && <p className="text-red-500">{errors.customerName}</p>}
                        </div>
                        <div>
                            <label htmlFor="mobileNumber1">Mobile number 1</label>
                            <input id="mobileNumber1" ref={mob1Ref} type="tel" placeholder="Enter Mobile number" className="form-input" value={mob1} onChange={(e) => setMob1(e.target.value)} />
                            {errors.mob1 && <p className="text-red-500">{errors.mob1}</p>}
                        </div>
                        <div>
                            <label htmlFor="mobileNumber2">Mobile number 2</label>
                            <input id="mobileNumber2" type="tel" placeholder="Enter Mobile number" className="form-input" value={mob2} onChange={(e) => setMob2(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="customerVehicleNumber">Customer vehicle number</label>
                            <input
                                id="customerVehicleNumber"
                                type="text"
                                placeholder="Enter vehicle number"
                                className="form-input"
                                value={customerVehicleNumber}
                                onChange={(e) => setCustomerVehicleNumber(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="vehicleType">Select Vehicle Type by Tyre Number:</label>
                            <select id="vehicleType" name="vehicleType" className="form-select" value={selectedVehicleType} onChange={handleChange}>
                                <option value="" disabled>
                                    Select a vehicle type
                                </option>
                                {/* Two-Wheelers */}
                                <optgroup label="Two-Wheelers (2 Tyres)">
                                    <option value="bicycle">Bicycle</option>
                                    <option value="motorcycle">Motorcycle</option>
                                    <option value="scooter">Scooter</option>
                                    <option value="moped">Moped</option>
                                </optgroup>
                                {/* Three-Wheelers */}
                                <optgroup label="Three-Wheelers (3 Tyres)">
                                    <option value="auto-rickshaw">Auto-rickshaw</option>
                                    <option value="tuk-tuk">Tuk-tuk</option>
                                    <option value="motorized-tricycle">Motorized Tricycle</option>
                                </optgroup>
                                {/* Four-Wheelers */}
                                <optgroup label="Four-Wheelers (4 Tyres)">
                                    <option value="car">Car</option>
                                    <option value="jeep">Jeep</option>
                                    <option value="suv">SUV</option>
                                    <option value="pickup-truck">Pickup Truck</option>
                                </optgroup>
                                {/* Six-Wheelers */}
                                <optgroup label="Six-Wheelers (6 Tyres)">
                                    <option value="truck">Medium-sized Truck</option>
                                    <option value="bus">Bus</option>
                                </optgroup>
                                {/* Eight-Wheelers and Above */}
                                <optgroup label="Eight-Wheelers and Above">
                                    <option value="large-truck">Large Truck</option>
                                    <option value="heavy-duty-vehicle">Heavy-duty Vehicle</option>
                                    <option value="crane">Crane</option>
                                    <option value="tanker">Tanker</option>
                                    <option value="articulated-lorry">Articulated Lorry</option>
                                </optgroup>
                                {/* Tracked Vehicles */}
                                <optgroup label="Tracked Vehicles (No Tyres)">
                                    <option value="bulldozer">Bulldozer</option>
                                    <option value="tank">Tank</option>
                                </optgroup>
                            </select>
                            {errors.selectedVehicleType && <p className="text-red-500">{errors.selectedVehicleType}</p>}
                        </div>
                        <div>
                            <label htmlFor="brandName">Brand name </label>
                            <input id="brandName" type="text" placeholder="Enter brand name" className="form-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="comments">Comments </label>
                            <textarea id="brandName" className="form-input" value={comments} onChange={(e) => setComments(e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            {uid ? (
                                <button type="button" className="btn btn-info mt-5" onClick={handleUpdate}>
                                    Update
                                </button>
                            ) : (
                                <button type="button" className="btn btn-success mt-5" onClick={handleSubmit}>
                                    Save
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            {/* modal for creating showroom  */}
            <ShowroomCreate isOpen={modal2} onClose={handleCloseModal} />
            {/* modal for select driver and provider  */}
            <Transition appear show={modal6} as={Fragment}>
                <Dialog as="div" open={modal6} onClose={() => setModal6(false)}>
                    <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0" />
                    </TransitionChild>
                    <div className="fixed inset-0 bg-[black]/60 z-[999]">
                        <div className="flex items-start justify-center min-h-screen px-4">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl my-8 text-black dark:text-white-dark">
                                    {/* Header */}
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                        <h5 className="font-bold text-lg">Select Driver</h5>
                                        <button onClick={closeDriverModal} type="button" className="text-white-dark hover:text-dark">
                                            <IoIosCloseCircleOutline />
                                        </button>
                                    </div>

                                    {/* Main Content with Fixed Height */}
                                    <div className="p-5 h-[500px] flex flex-col">
                                        {/* Scrollable Table */}
                                        <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] flex-grow overflow-y-auto">
                                            <div className="table-responsive">
                                                <table className="table-hover w-full">
                                                    <thead>
                                                        <tr className="!bg-transparent dark:!bg-transparent">
                                                            <th>
                                                                <p style={{ fontWeight: 'bold' }}>Name</p>
                                                            </th>
                                                            <th>
                                                                <p style={{ fontWeight: 'bold' }}>Pickup Distance</p>
                                                            </th>
                                                            <th>
                                                                <p style={{ fontWeight: 'bold' }}>Payable Amount</p>
                                                            </th>
                                                            <th>
                                                                <p style={{ fontWeight: 'bold' }}>Profit</p>
                                                            </th>
                                                            <th>
                                                                <p style={{ fontWeight: 'bold' }}>Select</p>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {/* Dummy Driver Row */}
                                                        <tr>
                                                            <td>
                                                                <div className="whitespace-nowrap font-bold text-red-500">Dummy Driver</div>
                                                            </td>
                                                            <td>Location</td>
                                                            <td style={{ color: 'green' }}>{PayableAmount}</td>
                                                            <td style={{ color: 'blue' }}>{afterExpence}</td>
                                                            <td className="text-center">
                                                                <button
                                                                    className="btn btn-danger"
                                                                    onClick={() =>
                                                                        handleSelect({
                                                                            name: 'Dummy Driver',
                                                                            _id: 'dummy',
                                                                            vehicle: {}, // Mark this as a driver by providing an empty vehicle object or desired details
                                                                        })
                                                                    }
                                                                >
                                                                    <IconPlus />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {drivers.map((data) => (
                                                            <tr key={data._id}>
                                                                <td>
                                                                    <div className="whitespace-nowrap">{data.name}</div>
                                                                </td>
                                                                <td>location</td>
                                                                <td style={{ color: 'green' }}>{PayableAmount}</td>
                                                                <td style={{ color: 'blue' }}>{afterExpence}</td>
                                                                <td className="text-center">
                                                                    <button className="btn btn-success" onClick={() => handleSelect(data)}>
                                                                        <IconPlus />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {providers.map((data) => (
                                                            <tr key={data._id}>
                                                                <td>
                                                                    <div className="whitespace-nowrap" style={{ color: 'blue' }}>
                                                                        {data.name}
                                                                    </div>
                                                                </td>
                                                                <td>location</td>
                                                                <td style={{ color: 'green' }}>{PayableAmount}</td>
                                                                <td style={{ color: 'blue' }}>{afterExpence}</td>{' '}
                                                                <td className="text-right">
                                                                    <button className="btn btn-success" onClick={() => handleSelect(data)}>
                                                                        <IconPlus />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex justify-end items-center mt-4">
                                            <button onClick={closeDriverModal} type="button" className="btn btn-outline-danger">
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            {/* // opening modal for delete confirmation  */}
            <ConfirmationModal
                isVisible={confirmationVisible}
                onConfirm={() => {
                    setTotalAmount(adjustmentValue);
                    setConfirmationVisible(false);
                }}
                onCancel={() => setConfirmationVisible(false)}
            />
        </div>
    );
};

export default AddBookingWithoutAuth;
