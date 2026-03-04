using Avalonia.Controls;
using QualityClient.Services;
using QualityClient.ViewModels;

namespace QualityClient.Views;

public partial class MainWindow : Window
{
    public MainWindow(QualityApiClient apiClient)
    {
        InitializeComponent();
        var vm = new MainViewModel(apiClient);
        DataContext = vm;
        // Load approvals on startup
        _ = vm.LoadApprovalsAsync();
    }
}
