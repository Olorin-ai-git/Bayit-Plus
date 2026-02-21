import Foundation

// MARK: - Date Formatters & Options

extension EPGView {
    static let dateValueFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let dayLabelFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE d"
        return formatter
    }()

    static let todayLabelFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "'Today'"
        return formatter
    }()

    var dateOptions: [(label: String, value: String?)] {
        let calendar = Calendar.current
        let today = Date()

        return (0 ..< 7).map { offset in
            let date = calendar.date(byAdding: .day, value: offset, to: today) ?? today
            let label = offset == 0
                ? Self.todayLabelFormatter.string(from: date)
                : Self.dayLabelFormatter.string(from: date)
            return (
                label: label,
                value: offset == 0 ? nil : Self.dateValueFormatter.string(from: date)
            )
        }
    }
}
