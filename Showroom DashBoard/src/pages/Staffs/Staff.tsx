import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

interface Staff {
  id: string;
  name: string;
  phoneNumber: string;
}

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const showroomId = localStorage.getItem("showroomId");
  const uid = import.meta.env.VITE_REACT_APP_UID;

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const db = getFirestore();
        if (showroomId) {
          const showroomDocRef = doc(db, `user/${uid}/showroom/${showroomId}`);
          const showroomDoc = await getDoc(showroomDocRef);

          if (showroomDoc.exists()) {
            const showroomData = showroomDoc.data();
            const staffData: Staff[] = showroomData.staff.map((staffMember: any) => ({
              id: staffMember.phoneNumber,
              name: staffMember.name,
              phoneNumber: staffMember.phoneNumber,
            }));

            setStaff(staffData);
          } else {
            console.error("Showroom document does not exist");
          }
        } else {
          console.error("showroomId is not available");
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      }
    };

    fetchStaff();
  }, [showroomId, uid]);

  const deleteStaffMember = async (phoneNumber: string) => {
    try {
      setLoading((prev) => ({ ...prev, [phoneNumber]: true }));

      const db = getFirestore();
      const showroomDocRef = doc(db, `user/${uid}/showroom/${showroomId}`);
      const showroomDocSnapshot = await getDoc(showroomDocRef);
      if (!showroomDocSnapshot.exists()) {
        console.error("Showroom does not exist");
        return;
      }

      const showroomData = showroomDocSnapshot.data();
      const updatedStaff = showroomData.staff.filter((member: any) => member.phoneNumber !== phoneNumber);

      await updateDoc(showroomDocRef, { staff: updatedStaff });
      setStaff(updatedStaff);
      console.log("Staff member deleted successfully");
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
