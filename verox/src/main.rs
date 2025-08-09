mod cli;
mod wallet;
mod crypto;
mod biometric;
mod types;
mod utils;

#[tokio::main]
async fn main() {
    let cli = cli::Cli::new();
    cli.run().await;
}
