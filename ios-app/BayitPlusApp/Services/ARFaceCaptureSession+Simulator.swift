import Foundation

// MARK: - Simulator Synthetic Data

#if targetEnvironment(simulator)
    extension ARFaceCaptureSession {
        static func syntheticResult() -> FaceCaptureResult {
            let rows = 10
            let cols = 10
            let halfWidth: Float = 0.075
            let halfHeight: Float = 0.10

            var vertices: [SIMD3<Float>] = []
            var uvs: [SIMD2<Float>] = []

            for r in 0 ..< rows {
                let v = Float(r) / Float(rows - 1)
                let y = halfHeight - v * 2 * halfHeight
                for c in 0 ..< cols {
                    let u = Float(c) / Float(cols - 1)
                    let x = -halfWidth + u * 2 * halfWidth
                    let nx = x / halfWidth
                    let ny = y / halfHeight
                    let z: Float = max(0, 0.03 * (1.0 - nx * nx - ny * ny))
                    vertices.append(SIMD3<Float>(x, y, z))
                    uvs.append(SIMD2<Float>(u, v))
                }
            }

            var indices: [UInt32] = []
            for r in 0 ..< (rows - 1) {
                for c in 0 ..< (cols - 1) {
                    let tl = UInt32(r * cols + c)
                    let tr = tl + 1
                    let bl = tl + UInt32(cols)
                    let br = bl + 1
                    indices.append(contentsOf: [tl, bl, tr, tr, bl, br])
                }
            }

            let count = vertices.count
            let morphs = buildSyntheticMorphTargets(
                rows: rows, cols: cols, vertexCount: count
            )

            return FaceCaptureResult(
                vertices: vertices,
                triangleIndices: indices,
                textureCoordinates: uvs,
                morphTargetDeltas: morphs.deltas,
                morphTargetNames: morphs.names,
                faceTexture: nil
            )
        }

        private static func buildSyntheticMorphTargets(
            rows: Int, cols: Int, vertexCount: Int
        ) -> (deltas: [[SIMD3<Float>]], names: [String]) {
            var jawOpen = [SIMD3<Float>](repeating: .zero, count: vertexCount)
            for r in (rows - 3) ..< rows {
                for c in 0 ..< cols {
                    let strength = Float(r - (rows - 3) + 1) / 3.0
                    jawOpen[r * cols + c] = SIMD3<Float>(0, -0.02 * strength, 0)
                }
            }

            var smile = [SIMD3<Float>](repeating: .zero, count: vertexCount)
            for r in (rows / 2 - 1) ... (rows / 2 + 1) {
                for c in 0 ..< cols {
                    let laterality = abs(Float(c) / Float(cols - 1) - 0.5) * 2.0
                    smile[r * cols + c] = SIMD3<Float>(
                        0, 0.01 * laterality, 0.005 * laterality
                    )
                }
            }

            var browUp = [SIMD3<Float>](repeating: .zero, count: vertexCount)
            for r in 0 ..< 2 {
                for c in 0 ..< cols {
                    let strength = Float(2 - r) / 2.0
                    browUp[r * cols + c] = SIMD3<Float>(0, 0.01 * strength, 0)
                }
            }

            return (
                deltas: [jawOpen, smile, browUp],
                names: ["jawOpen", "mouthSmile_L", "browInnerUp"]
            )
        }
    }
#endif
