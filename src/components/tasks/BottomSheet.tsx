
interface BottomSheetProps {
  children: React.ReactNode;
  onClose: () => void;
}

const BottomSheet = ({ children, onClose }: BottomSheetProps) => {
  return (
    <>
      {/* Dim backdrop — clicking it closes the sheet */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60]"
      />

      {/* Sheet panel */}
      <div className="
        fixed bottom-0 left-0 right-0
        max-w-lg mx-auto
        bg-white rounded-t-3xl shadow-xl
        z-[70]
        pt-5 px-5 pb-10
        border-t border-gray-100
        animate-[slideUp_0.3s_ease-out]
        max-h-[90vh] overflow-y-auto
      ">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        {children}
      </div>
    </>
  );
};

export default BottomSheet;
