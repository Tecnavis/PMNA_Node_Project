import React, { useEffect, useState } from 'react'
import { axiosInstance as axios, BASE_URL } from '../../config/axiosConfig'

interface Notes {
    note: string,
    writtenBy: string,
    role: string
}

interface BookingNotes {
    role: string
    id: string
}

const BookingNotes: React.FC<BookingNotes> = ({ role, id }) => {

    const [notes, setNotes] = useState<Notes[]>([])
    const [note, setNote] = useState<string>('')

    const fetchNotes = async () => {
        const res = await axios.get(`${BASE_URL}/bookingnote`, {
            params: { id }
        })
        const data = res.data
        setNotes(data.data)
    }

    const addNotes = async () => {
        const res = await axios.post(`${BASE_URL}/bookingnote/${id}`, {
            note,
            role
        })
        fetchNotes()
        setNote('')
    }

    useEffect(() => {
        fetchNotes()
    }, [])
    return (
        <section className="py-8 rounded-xl relative border w-full">
            <div className="w-full px-4 md:px-5 lg:px-5">
                <div className="w-full flex-col justify-start items-start lg:gap-4 gap-2 inline-flex">
                    <h2 className="text-gray-600 text-xl font-bold">Notes :</h2>
                    <div className="w-full flex-col justify-start items-start gap-4 flex">
                        <div className="w-full relative flex justify-between gap-2">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full py-3 px-5 rounded-lg border border-gray-300 bg-white shadow-[0px_1px_2px_0px_rgba(16,_24,_40,_0.05)] focus:outline-none text-gray-900 placeholder-gray-400  font-normal leading-relaxed"
                                placeholder="Leave a note..."
                            />
                            <button className="absolute right-6 top-[50%] -translate-y-1/2" onClick={addNotes}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <g clipPath="url(#  clip0_2063_2504)">
                                        <path
                                            d="M10.0194 1.66699V5.6556C1.69526 5.6556 1.54178 14.4163 1.69573 18.3337C1.69573 16.4818 5.84659 10.0003 10.0194 10.6414V14.63L18.3332 8.14847L10.0194 1.66699Z"
                                            stroke="#111827"
                                            strokeWidth="1.6"
                                            strokeLinejoin="round"
                                        />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_2063_2504">
                                            <rect width="20" height="20" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                        </div>
                        {
                            notes && notes?.map((note, index) => (
                                <div
                                    className="w-full lg:p-4 p-2 bg-white rounded-xl border border-gray-200 flex-col justify-start items-start flex">
                                    <div className="w-full flex-col justify-start items-start gap-3.5 flex">
                                        <div className="w-full justify-between items-center inline-flex">
                                            <div className="justify-start items-center gap-2.5 flex">
                                                <div>
                                                    <h6 className='text-red-500'>Written By:</h6>
                                                </div>
                                                <div className="flex-col justify-start items-start gap-1 inline-flex">
                                                    <h5 className="underline text-gray-900 text-sm font-semibold leading-snug">{note.role}</h5>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-gray-800 text-sm font-normal leading-snug">{note.note}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </section>
    )
}

export default BookingNotes
