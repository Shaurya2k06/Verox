#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

#ifdef __APPLE__
#include <Security/Security.h>
#include <LocalAuthentication/LocalAuthentication.h>
#include <Foundation/Foundation.h>

// Callback function type
typedef void (*AuthCallback)(int success, const char* error);

// Global callback storage
static AuthCallback global_callback = NULL;

int can_evaluate_biometric_policy() {
    @autoreleasepool {
        LAContext *context = [[LAContext alloc] init];
        NSError *error = nil;
        
        BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                                                error:&error];
        
        return canEvaluate ? 1 : 0;
    }
}

void evaluate_biometric_policy(const char* reason, AuthCallback callback) {
    @autoreleasepool {
        global_callback = callback;
        
        LAContext *context = [[LAContext alloc] init];
        NSString *reasonString = [NSString stringWithUTF8String:reason];
        
        [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                localizedReason:reasonString
                          reply:^(BOOL success, NSError *error) {
                              if (global_callback) {
                                  if (success) {
                                      global_callback(1, NULL);
                                  } else {
                                      const char* error_msg = error ? [[error localizedDescription] UTF8String] : "Authentication failed";
                                      global_callback(0, error_msg);
                                  }
                              }
                          }];
    }
}

#else

// Stub implementations for non-macOS platforms
int can_evaluate_biometric_policy() {
    return 0;
}

void evaluate_biometric_policy(const char* reason, void (*callback)(int, const char*)) {
    if (callback) {
        callback(0, "Biometrics not supported on this platform");
    }
}

#endif
