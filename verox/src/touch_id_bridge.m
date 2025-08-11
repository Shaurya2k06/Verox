#import <LocalAuthentication/LocalAuthentication.h>
#import <Foundation/Foundation.h>

// C interface for Touch ID authentication
int can_evaluate_biometric_policy(void) {
    LAContext *context = [[LAContext alloc] init];
    NSError *error = nil;
    
    BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics 
                                            error:&error];
    
    return canEvaluate ? 1 : 0;
}

typedef void (*BiometricCallback)(int success, const char* error);

void evaluate_biometric_policy(const char* reason, BiometricCallback callback) {
    LAContext *context = [[LAContext alloc] init];
    NSString *nsReason = [NSString stringWithUTF8String:reason];
    
    [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
            localizedReason:nsReason
                      reply:^(BOOL success, NSError * _Nullable error) {
        if (success) {
            callback(1, NULL);
        } else {
            const char* errorString = error ? [error.localizedDescription UTF8String] : "Unknown error";
            callback(0, errorString);
        }
    }];
}
