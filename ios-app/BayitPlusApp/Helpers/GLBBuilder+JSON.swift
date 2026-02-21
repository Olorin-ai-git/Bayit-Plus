import Foundation

// MARK: - JSON Construction

extension GLBBuilder {
    static func buildJSON(
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

    static func bufferView(_ offset: Int, _ length: Int, _ stride: Int?) -> String {
        if let s = stride {
            return "{\"buffer\":0,\"byteOffset\":\(offset),\"byteLength\":\(length),\"byteStride\":\(s)}"
        }
        return "{\"buffer\":0,\"byteOffset\":\(offset),\"byteLength\":\(length)}"
    }

    static func bufferViewNoStride(_ offset: Int, _ length: Int) -> String {
        "{\"buffer\":0,\"byteOffset\":\(offset),\"byteLength\":\(length)}"
    }

    static func accessor(
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
}
