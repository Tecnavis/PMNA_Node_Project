const BookingSkeleton = () => {
    return ([...Array(3)].map(() => (
        <div role="status" className="space-y-4 mt-5 animate-pulse w-full bg-white shadow-md rounded-xl p-4">
            <div className="flex justify-end">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="space-y-2">
                {[...Array(10)].map((_, index) => (
                    <div key={index} className="flex justify-between border-b py-2">
                        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
            <span className="sr-only">Loading...</span>
        </div>
    ))
    );
};

export default BookingSkeleton;
