export default function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-10">
      <p className="text-red-600 mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Retry
      </button>
    </div>
  );
}
