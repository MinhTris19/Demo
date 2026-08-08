function createRoleAssistant(role) {
  const roleConfig = {
    admin: {
      title: 'AI Quản trị',
      placeholder: 'Ví dụ: “Liệt kê học viên mới tháng này”',
      scope: 'Chỉ hỗ trợ quản trị hệ thống: học viên, giảng viên, lớp học, thống kê, phân công.'
    },
    teacher: {
      title: 'AI Giảng viên',
      placeholder: 'Ví dụ: “Tìm học viên tên Nguyễn Văn A”',
      scope: 'Chỉ hỗ trợ giảng viên: tìm học viên, xem lớp, điểm danh, lịch dạy.'
    },
    student: {
      title: 'AI Học viên',
      placeholder: 'Ví dụ: “Cho tôi xem lịch học tuần này”',
      scope: 'Chỉ hỗ trợ học viên: lịch học, điểm danh, khóa học, thông tin lớp.'
    }
  };

  const config = roleConfig[role] || roleConfig.student;

  return {
    config,
    answer(question) {
      const q = question.toLowerCase();

      if (role === 'teacher') {
        if (q.includes('tìm') || q.includes('học viên') || q.includes('nguyễn văn a') || q.includes('tên')) {
          return 'AI Giảng viên: Tôi có thể hỗ trợ tìm kiếm học viên theo tên, lớp học hoặc trạng thái điểm danh.';
        }
        if (q.includes('điểm danh') || q.includes('lịch dạy') || q.includes('lớp')) {
          return 'AI Giảng viên: Tôi có thể giúp bạn xem danh sách lớp, ghi nhận điểm danh và kiểm tra lịch dạy.';
        }
        return 'AI Giảng viên: Tôi chỉ hỗ trợ các câu hỏi liên quan đến giảng viên như tìm học viên, điểm danh hoặc quản lý lớp.';
      }

      if (role === 'student') {
        if (q.includes('lịch học') || q.includes('khóa học') || q.includes('điểm danh')) {
          return 'AI Học viên: Tôi có thể cung cấp thông tin về lịch học, khóa học và trạng thái điểm danh của bạn.';
        }
        return 'AI Học viên: Tôi chỉ hỗ trợ các câu hỏi liên quan đến học viên như khóa học, lịch học và điểm danh.';
      }

      if (role === 'admin') {
        if (q.includes('học viên') || q.includes('giảng viên') || q.includes('thống kê') || q.includes('lớp')) {
          return 'AI Quản trị: Tôi có thể hỗ trợ xem thống kê, quản lý học viên, giảng viên và phân công lớp học.';
        }
        return 'AI Quản trị: Tôi chỉ hỗ trợ các câu hỏi liên quan đến vận hành hệ thống, người dùng và thống kê.';
      }

      return 'AI: Tôi chưa hiểu câu hỏi của bạn.';
    }
  };
}
