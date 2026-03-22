import { Typography } from "antd";
import { FaGraduationCap } from "react-icons/fa6";

const { Text } = Typography;

const QualificationsTab = ({ qualifications }) => {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 m-0">
          Quá trình đào tạo
        </h3>
      </div>

      {qualifications?.length > 0 ? (
        <div className="space-y-3">
          {qualifications.map((q, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <FaGraduationCap className="text-gray-400 text-xl mt-0.5" />
                <div>
                  <Text className="block! font-medium! text-gray-900! text-base!">
                    {q.degree}
                  </Text>
                  <Text className="text-gray-500! text-sm!">
                    {q.institution}
                  </Text>
                </div>
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                Năm {q.year}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FaGraduationCap className="text-gray-300 text-4xl mb-3" />
          <Text className="text-gray-500! block">
            Chưa có thông tin bằng cấp
          </Text>
        </div>
      )}
    </div>
  );
};

export default QualificationsTab;
