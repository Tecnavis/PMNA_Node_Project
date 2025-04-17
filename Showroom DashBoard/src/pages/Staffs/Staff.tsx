import React, { useEffect, useState } from "react";
import axios from "axios";

interface Staff {
  _id: string;
  name: string;
  phoneNumber: string;
}

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const showroomId = localStorage.getItem('showroomId') || '';
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
console.log("showroomId",showroomId)

console.log("backendUrl",backendUrl)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axios.get(
          `${backendUrl}/showroom/showroom-staff/${showroomId}`,
          {
          
          }
        );
        if (response.data.success) {
          setStaff(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      }
    };

    if (showroomId) {
      fetchStaff();
    }
  }, [showroomId]);

  const deleteStaffMember = async (phoneNumber: string) => {
    setLoading((prev) => ({ ...prev, [phoneNumber]: true }));
    try {
      // Call your delete API here (assuming you have it)
      // await axios.delete(`${yourDeleteApiUrl}/${phoneNumber}`);

      // After deletion, update state locally (for demo purpose)
      setStaff((prevStaff) =>
        prevStaff.filter((member) => member.phoneNumber !== phoneNumber)
      );
    } catch (error) {
      console.error("Error deleting staff member:", error);
    } finally {
      setLoading((prev) => ({ ...prev, [phoneNumber]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">Staff Members</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="py-3 px-4 text-left border-b">Name</th>
              <th className="py-3 px-4 text-left border-b">Phone</th>
              <th className="py-3 px-4 text-center border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member, index) => (
              <tr key={index} className="border-b hover:bg-gray-50 transition">
                <td className="py-3 px-4">{member.name}</td>
                <td className="py-3 px-4">{member.phoneNumber}</td>
                <td className="py-3 px-4 text-center">
                  {loading[member.phoneNumber] ? (
                    <button className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block"></span>
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteStaffMember(member.phoneNumber)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Staff;
