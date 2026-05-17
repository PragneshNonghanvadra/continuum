import Foundation

public protocol NativeCapturePosting {
    func post(event: NativeCaptureEvent) throws
}

public struct ContinuumApiClient: NativeCapturePosting {
    private let apiBaseUrl: URL

    public init(apiBaseUrl: URL) {
        self.apiBaseUrl = apiBaseUrl
    }

    public func post(event: NativeCaptureEvent) throws {
        let url = apiBaseUrl.appendingPathComponent("native-capture/events")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONEncoder.continuum.encode(event)

        let semaphore = DispatchSemaphore(value: 0)
        final class Box: @unchecked Sendable {
            var data: Data?
            var response: URLResponse?
            var error: Error?
        }
        let box = Box()

        URLSession.shared.dataTask(with: request) { data, response, error in
            box.data = data
            box.response = response
            box.error = error
            semaphore.signal()
        }.resume()
        semaphore.wait()

        if let error = box.error {
            throw error
        }
        guard let statusCode = (box.response as? HTTPURLResponse)?.statusCode, (200..<300).contains(statusCode) else {
            throw NativeCaptureError("Continuum API rejected native capture event.")
        }
    }
}
