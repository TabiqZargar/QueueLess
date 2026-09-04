export default function DoctorDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
      <p className="mt-2 text-gray-600">View your assigned queue</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Current Patient
          </h2>
          <p className="mt-2 text-gray-500">No patient in consultation</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Queue Status
          </h2>
          <p className="mt-2 text-gray-500">No active queue</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
        <div className="mt-4 flex gap-4">
          <button
            disabled
            className="rounded-lg bg-gray-300 px-4 py-2 text-gray-500 cursor-not-allowed"
          >
            Start Consultation
          </button>
          <button
            disabled
            className="rounded-lg bg-gray-300 px-4 py-2 text-gray-500 cursor-not-allowed"
          >
            Complete Consultation
          </button>
        </div>
      </div>
    </div>
  );
}
