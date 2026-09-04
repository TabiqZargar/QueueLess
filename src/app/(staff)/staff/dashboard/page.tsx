export default function StaffDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
      <p className="mt-2 text-gray-600">Manage your clinic queues</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Queues
          </h2>
          <p className="mt-2 text-3xl font-bold text-primary-600">0</p>
          <p className="mt-1 text-sm text-gray-500">Currently active</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Patients Waiting
          </h2>
          <p className="mt-2 text-3xl font-bold text-warning-600">0</p>
          <p className="mt-1 text-sm text-gray-500">In all queues</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Patients Served Today
          </h2>
          <p className="mt-2 text-3xl font-bold text-success-600">0</p>
          <p className="mt-1 text-sm text-gray-500">Completed consultations</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Queue List</h2>
        <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-6 text-center text-gray-500">
            No queues available. Create a queue to get started.
          </div>
        </div>
      </div>
    </div>
  );
}
