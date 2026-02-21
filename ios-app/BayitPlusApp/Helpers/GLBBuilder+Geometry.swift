import Foundation
import simd

// MARK: - Geometry Helpers

extension GLBBuilder {
    static func computeNormals(
        vertices: [SIMD3<Float>], indices: [UInt32]
    ) -> [SIMD3<Float>] {
        var normals = [SIMD3<Float>](repeating: .zero, count: vertices.count)

        for i in stride(from: 0, to: indices.count, by: 3) {
            let i0 = Int(indices[i])
            let i1 = Int(indices[i + 1])
            let i2 = Int(indices[i + 2])
            let edge1 = vertices[i1] - vertices[i0]
            let edge2 = vertices[i2] - vertices[i0]
            let faceNormal = simd_cross(edge1, edge2)
            normals[i0] += faceNormal
            normals[i1] += faceNormal
            normals[i2] += faceNormal
        }

        return normals.map { n in
            let len = simd_length(n)
            return len > 0 ? n / len : SIMD3<Float>(0, 0, 1)
        }
    }

    static func computeBounds(
        _ vertices: [SIMD3<Float>]
    ) -> (min: SIMD3<Float>, max: SIMD3<Float>) {
        guard let first = vertices.first else {
            return (.zero, .zero)
        }
        var minV = first
        var maxV = first
        for v in vertices {
            minV = simd_min(minV, v)
            maxV = simd_max(maxV, v)
        }
        return (minV, maxV)
    }
}
