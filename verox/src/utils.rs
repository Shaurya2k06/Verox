pub fn get_data_dir() -> String {
    let path = "./keystore";
    println!(" Data directory: {}", path);
    path.to_string()
}
