import Foundation

extension Data {
    mutating func appendMultipart(name: String, value: String, boundary: String) {
        let field = "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n"
        guard let fieldData = field.data(using: .utf8) else { return }
        append(fieldData)
    }

    mutating func appendMultipartFile(name: String, filename: String, mimeType: String, data: Data, boundary: String) {
        let header = "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\nContent-Type: \(mimeType)\r\n\r\n"
        guard let headerData = header.data(using: .utf8),
              let lineBreak = "\r\n".data(using: .utf8) else { return }
        append(headerData)
        append(data)
        append(lineBreak)
    }
}
