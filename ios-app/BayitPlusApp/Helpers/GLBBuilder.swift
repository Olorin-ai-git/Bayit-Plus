import BayitCore
import Foundation
import simd

/// Builds a binary glTF (GLB) file from ARKit face capture results.
/// Binary and geometry helpers are in `GLBBuilder+Geometry.swift`.
enum GLBBuilder {
    static let logger = BayitLogger(category: "GLBBuilder")

    static func build(from result: FaceCaptureResult) -> Data? {
        let vertexCount = result.vertices.count
        guard vertexCount > 0, !result.triangleIndices.isEmpty else {
            logger.error("Cannot build GLB: empty geometry")
            return nil
        }

        let normals = computeNormals(
            vertices: result.vertices,
            indices: result.triangleIndices
        )

        var binData = Data()
        let positionsOffset = binData.count
        appendVec3Array(result.vertices, to: &binData)
        let positionsLength = binData.count - positionsOffset

        let normalsOffset = binData.count
        appendVec3Array(normals, to: &binData)
        let normalsLength = binData.count - normalsOffset

        let uvsOffset = binData.count
        appendVec2Array(result.textureCoordinates, to: &binData)
        let uvsLength = binData.count - uvsOffset

        let indicesOffset = binData.count
        appendUInt32Array(result.triangleIndices, to: &binData)
        let indicesLength = binData.count - indicesOffset

        var morphTargetBufferViews: [(offset: Int, length: Int)] = []
        for deltas in result.morphTargetDeltas {
            let offset = binData.count
            appendVec3Array(deltas, to: &binData)
            morphTargetBufferViews.append((offset, binData.count - offset))
        }

        var textureBufferView: (offset: Int, length: Int)?
        if let texData = result.faceTexture {
            let offset = binData.count
            binData.append(texData)
            padToAlignment(&binData)
            textureBufferView = (offset, texData.count)
        }

        let json = buildJSON(
            vertexCount: vertexCount,
            indexCount: result.triangleIndices.count,
            positionsOffset: positionsOffset,
            positionsLength: positionsLength,
            normalsOffset: normalsOffset,
            normalsLength: normalsLength,
            uvsOffset: uvsOffset,
            uvsLength: uvsLength,
            indicesOffset: indicesOffset,
            indicesLength: indicesLength,
            morphTargetBufferViews: morphTargetBufferViews,
            morphTargetNames: result.morphTargetNames,
            textureBufferView: textureBufferView,
            totalBufferLength: binData.count,
            positionBounds: computeBounds(result.vertices)
        )

        guard let jsonData = json.data(using: .utf8) else {
            logger.error("Failed to encode glTF JSON")
            return nil
        }

        var paddedJSON = jsonData
        while paddedJSON.count % 4 != 0 {
            paddedJSON.append(0x20)
        }

        var glb = Data()
        appendUInt32(0x4654_6C67, to: &glb)
        appendUInt32(2, to: &glb)

        let totalLength = 12 + 8 + paddedJSON.count + 8 + binData.count
        appendUInt32(UInt32(totalLength), to: &glb)

        appendUInt32(UInt32(paddedJSON.count), to: &glb)
        appendUInt32(0x4E4F_534A, to: &glb)
        glb.append(paddedJSON)

        appendUInt32(UInt32(binData.count), to: &glb)
        appendUInt32(0x004E_4942, to: &glb)
        glb.append(binData)

        logger.info(
            "GLB built: \(glb.count) bytes, \(vertexCount) vertices, "
                + "\(result.morphTargetNames.count) morph targets"
        )
        return glb
    }
}
