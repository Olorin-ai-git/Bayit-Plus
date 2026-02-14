import BayitCore
import Foundation
import simd

enum GLBBuilder {

    private static let logger = BayitLogger(category: "GLBBuilder")

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
        appendUInt32(0x46546C67, to: &glb)
        appendUInt32(2, to: &glb)

        let totalLength = 12 + 8 + paddedJSON.count + 8 + binData.count
        appendUInt32(UInt32(totalLength), to: &glb)

        appendUInt32(UInt32(paddedJSON.count), to: &glb)
        appendUInt32(0x4E4F534A, to: &glb)
        glb.append(paddedJSON)

        appendUInt32(UInt32(binData.count), to: &glb)
        appendUInt32(0x004E4942, to: &glb)
        glb.append(binData)

        logger.info(
            "GLB built: \(glb.count) bytes, \(vertexCount) vertices, "
            + "\(result.morphTargetNames.count) morph targets"
        )
        return glb
    }

    // MARK: - JSON Construction

    private static func buildJSON(
        vertexCount: Int,
        indexCount: Int,
        positionsOffset: Int,
        positionsLength: Int,
        normalsOffset: Int,
        normalsLength: Int,
        uvsOffset: Int,
        uvsLength: Int,
        indicesOffset: Int,
        indicesLength: Int,
        morphTargetBufferViews: [(offset: Int, length: Int)],
        morphTargetNames: [String],
        textureBufferView: (offset: Int, length: Int)?,
        totalBufferLength: Int,
        positionBounds: (min: SIMD3<Float>, max: SIMD3<Float>)
    ) -> String {
        var bvIndex = 0
        var accIndex = 0
        var bufferViews: [String] = []
        var accessors: [String] = []

        let positionBVIdx = bvIndex
        bufferViews.append(bufferView(positionsOffset, positionsLength, 12))
        bvIndex += 1

        let positionAccIdx = accIndex
        accessors.append(accessor(positionBVIdx, vertexCount, "VEC3", 5126, positionBounds))
        accIndex += 1

        let normalBVIdx = bvIndex
        bufferViews.append(bufferView(normalsOffset, normalsLength, 12))
        bvIndex += 1

        let normalAccIdx = accIndex
        accessors.append(accessor(normalBVIdx, vertexCount, "VEC3", 5126, nil))
        accIndex += 1

        let uvBVIdx = bvIndex
        bufferViews.append(bufferView(uvsOffset, uvsLength, 8))
        bvIndex += 1

        let uvAccIdx = accIndex
        accessors.append(accessor(uvBVIdx, vertexCount, "VEC2", 5126, nil))
        accIndex += 1

        let indexBVIdx = bvIndex
        bufferViews.append(bufferView(indicesOffset, indicesLength, nil))
        bvIndex += 1

        let indexAccIdx = accIndex
        accessors.append(accessor(indexBVIdx, indexCount, "SCALAR", 5125, nil))
        accIndex += 1

        var morphTargets: [String] = []
        for view in morphTargetBufferViews {
            let morphBVIdx = bvIndex
            bufferViews.append(bufferView(view.offset, view.length, 12))
            bvIndex += 1

            let morphAccIdx = accIndex
            accessors.append(accessor(morphBVIdx, vertexCount, "VEC3", 5126, nil))
            accIndex += 1

            morphTargets.append("{\"POSITION\":\(morphAccIdx)}")
        }

        var materialSection = ""
        var textureSection = ""
        var imageSection = ""

        if let texBV = textureBufferView {
            let texBVIdx = bvIndex
            bufferViews.append(bufferViewNoStride(texBV.offset, texBV.length))
            bvIndex += 1

            imageSection = ",\"images\":[{\"bufferView\":\(texBVIdx),\"mimeType\":\"image/png\"}]"
            textureSection = ",\"textures\":[{\"source\":0}]"
            materialSection = ",\"materials\":[{\"pbrMetallicRoughness\":{\"baseColorTexture\":{\"index\":0},\"metallicFactor\":0.0,\"roughnessFactor\":0.8}}]"
        }

        let namesJSON = morphTargetNames.map { "\"\($0)\"" }.joined(separator: ",")
        let targetsJSON = morphTargets.joined(separator: ",")

        let materialIdx = textureBufferView != nil ? ",\"material\":0" : ""

        let meshJSON = """
        {"primitives":[{"attributes":{"POSITION":\(positionAccIdx),\
        "NORMAL":\(normalAccIdx),"TEXCOORD_0":\(uvAccIdx)},\
        "indices":\(indexAccIdx)\(materialIdx)\
        \(morphTargets.isEmpty ? "" : ",\"targets\":[\(targetsJSON)]")}]\
        \(morphTargetNames.isEmpty ? "" : ",\"extras\":{\"targetNames\":[\(namesJSON)]}")}
        """

        let bvsJSON = bufferViews.joined(separator: ",")
        let accsJSON = accessors.joined(separator: ",")

        return """
        {"asset":{"version":"2.0","generator":"BayitPlus-ARKit"},\
        "scene":0,"scenes":[{"nodes":[0]}],\
        "nodes":[{"mesh":0,"name":"ARKitFace"}],\
        "meshes":[\(meshJSON)],\
        "accessors":[\(accsJSON)],\
        "bufferViews":[\(bvsJSON)],\
        "buffers":[{"byteLength":\(totalBufferLength)}]\
        \(materialSection)\(textureSection)\(imageSection)}
        """
    }

    // MARK: - JSON Helpers

    private static func bufferView(_ offset: Int, _ length: Int, _ stride: Int?) -> String {
        if let s = stride {
            return "{\"buffer\":0,\"byteOffset\":\(offset),\"byteLength\":\(length),\"byteStride\":\(s)}"
        }
        return "{\"buffer\":0,\"byteOffset\":\(offset),\"byteLength\":\(length)}"
    }

    private static func bufferViewNoStride(_ offset: Int, _ length: Int) -> String {
        "{\"buffer\":0,\"byteOffset\":\(offset),\"byteLength\":\(length)}"
    }

    private static func accessor(
        _ bvIdx: Int, _ count: Int, _ type: String, _ componentType: Int,
        _ bounds: (min: SIMD3<Float>, max: SIMD3<Float>)?
    ) -> String {
        var json = "{\"bufferView\":\(bvIdx),\"componentType\":\(componentType),"
        json += "\"count\":\(count),\"type\":\"\(type)\""
        if let b = bounds {
            json += ",\"min\":[\(b.min.x),\(b.min.y),\(b.min.z)]"
            json += ",\"max\":[\(b.max.x),\(b.max.y),\(b.max.z)]"
        }
        json += "}"
        return json
    }

    // MARK: - Binary Helpers

    private static func appendVec3Array(_ array: [SIMD3<Float>], to data: inout Data) {
        for v in array {
            var x = v.x; var y = v.y; var z = v.z
            data.append(Data(bytes: &x, count: 4))
            data.append(Data(bytes: &y, count: 4))
            data.append(Data(bytes: &z, count: 4))
        }
        padToAlignment(&data)
    }

    private static func appendVec2Array(_ array: [SIMD2<Float>], to data: inout Data) {
        for v in array {
            var x = v.x; var y = v.y
            data.append(Data(bytes: &x, count: 4))
            data.append(Data(bytes: &y, count: 4))
        }
        padToAlignment(&data)
    }

    private static func appendUInt32Array(_ array: [UInt32], to data: inout Data) {
        for v in array {
            var value = v
            data.append(Data(bytes: &value, count: 4))
        }
        padToAlignment(&data)
    }

    private static func appendUInt32(_ value: UInt32, to data: inout Data) {
        var v = value
        data.append(Data(bytes: &v, count: 4))
    }

    private static func padToAlignment(_ data: inout Data) {
        while data.count % 4 != 0 {
            data.append(0x00)
        }
    }

    // MARK: - Geometry Helpers

    private static func computeNormals(
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

    private static func computeBounds(
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
