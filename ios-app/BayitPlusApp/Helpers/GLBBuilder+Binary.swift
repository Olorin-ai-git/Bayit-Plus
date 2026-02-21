import Foundation
import simd

// MARK: - Binary Helpers

extension GLBBuilder {
    static func appendVec3Array(_ array: [SIMD3<Float>], to data: inout Data) {
        for v in array {
            var x = v.x; var y = v.y; var z = v.z
            data.append(Data(bytes: &x, count: 4))
            data.append(Data(bytes: &y, count: 4))
            data.append(Data(bytes: &z, count: 4))
        }
        padToAlignment(&data)
    }

    static func appendVec2Array(_ array: [SIMD2<Float>], to data: inout Data) {
        for v in array {
            var x = v.x; var y = v.y
            data.append(Data(bytes: &x, count: 4))
            data.append(Data(bytes: &y, count: 4))
        }
        padToAlignment(&data)
    }

    static func appendUInt32Array(_ array: [UInt32], to data: inout Data) {
        for v in array {
            var value = v
            data.append(Data(bytes: &value, count: 4))
        }
        padToAlignment(&data)
    }

    static func appendUInt32(_ value: UInt32, to data: inout Data) {
        var v = value
        data.append(Data(bytes: &v, count: 4))
    }

    static func padToAlignment(_ data: inout Data) {
        while data.count % 4 != 0 {
            data.append(0x00)
        }
    }
}
