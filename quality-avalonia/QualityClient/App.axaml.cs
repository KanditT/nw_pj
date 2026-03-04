using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using QualityClient.Views;
using QualityClient.Services;
using Microsoft.Extensions.Http;

namespace QualityClient;

public class App : Application
{
    public override void Initialize() => AvaloniaXamlLoader.Load(this);

    public override void OnFrameworkInitializationCompleted()
    {
        var apiBase = Environment.GetEnvironmentVariable("QUALITY_API_URL") ?? "http://localhost:8000";
        var apiClient = new QualityApiClient(apiBase);

        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            desktop.MainWindow = new MainWindow(apiClient);
        }
        base.OnFrameworkInitializationCompleted();
    }
}
