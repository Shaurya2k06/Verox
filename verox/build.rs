fn main() {
    #[cfg(target_os = "macos")]
    {
        // Link the required frameworks
        println!("cargo:rustc-link-lib=framework=LocalAuthentication");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=Security");
        
        // Compile the Objective-C bridge
        cc::Build::new()
            .file("src/touch_id_bridge.m")
            .flag("-fobjc-arc") // Enable Automatic Reference Counting
            .compile("touch_id_bridge");
        
        println!("cargo:rerun-if-changed=src/touch_id_bridge.m");
    }
}
