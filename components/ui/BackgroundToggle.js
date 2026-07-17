// Floating control for the ambient background. State lives in _app.js so the
// visitor's choice stays constant while they move between pages.
export default function BackgroundToggle({ isFluidMode, onToggle }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isFluidMode}
        className="text-xs md:text-sm px-4 py-2 bg-dark-800/40 hover:bg-dark-700/60 backdrop-blur-md text-gray-400 hover:text-white rounded-full border border-dark-600/50 shadow-lg transition-all duration-300 flex items-center group"
      >
        <i
          className={`fas fa-palette mr-2 transition-colors ${
            isFluidMode ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
          }`}
        ></i>
        {isFluidMode ? 'Go back to the plain background' : 'Bored with the plain background?'}
      </button>
    </div>
  )
}
