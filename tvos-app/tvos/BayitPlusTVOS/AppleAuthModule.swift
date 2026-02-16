import Foundation
import AuthenticationServices
import React

@objc(AppleAuthModule)
class AppleAuthModule: NSObject {

  private var authController: ASAuthorizationController?
  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?

  @objc
  func signIn(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {

    self.resolve = resolve
    self.reject = reject

    DispatchQueue.main.async {
      let appleIDProvider = ASAuthorizationAppleIDProvider()
      let request = appleIDProvider.createRequest()
      request.requestedScopes = [.fullName, .email]

      let authController = ASAuthorizationController(authorizationRequests: [request])
      authController.delegate = self

      self.authController = authController
      authController.performRequests()
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

extension AppleAuthModule: ASAuthorizationControllerDelegate {
  func authorizationController(controller: ASAuthorizationController,
                                didCompleteWithAuthorization authorization: ASAuthorization) {

    guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
          let identityTokenData = appleIDCredential.identityToken,
          let identityToken = String(data: identityTokenData, encoding: .utf8) else {
      self.reject?("E_APPLE_AUTH", "Failed to extract identity token", nil)
      return
    }

    var result: [String: Any] = [
      "identityToken": identityToken,
      "user": appleIDCredential.user
    ]

    if let email = appleIDCredential.email {
      result["email"] = email
    }

    if let fullName = appleIDCredential.fullName {
      var nameComponents: [String: String] = [:]
      if let givenName = fullName.givenName {
        nameComponents["givenName"] = givenName
      }
      if let familyName = fullName.familyName {
        nameComponents["familyName"] = familyName
      }
      if !nameComponents.isEmpty {
        result["fullName"] = nameComponents
      }
    }

    self.resolve?(result)
    self.authController = nil
  }

  func authorizationController(controller: ASAuthorizationController,
                                didCompleteWithError error: Error) {
    let nsError = error as NSError

    if nsError.code == 1001 {
      self.reject?("E_APPLE_AUTH_CANCELED", "User canceled Apple Sign In", error)
    } else {
      self.reject?("E_APPLE_AUTH_ERROR", error.localizedDescription, error)
    }

    self.authController = nil
  }
}
