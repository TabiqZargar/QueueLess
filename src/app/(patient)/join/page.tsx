export default function JoinQueuePage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">Join a Queue</h1>
      <p className="mt-2 text-gray-600">
        Select a clinic and department to join the queue.
      </p>
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Clinic
          </label>
          <select className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option>Select a clinic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <select className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option>Select a department</option>
          </select>
        </div>
        <button className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 focus-ring">
          Continue
        </button>
      </div>
    </div>
  );
}
