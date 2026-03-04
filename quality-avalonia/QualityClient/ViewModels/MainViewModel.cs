using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using QualityClient.Services;
using System.Collections.ObjectModel;

namespace QualityClient.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly QualityApiClient _api;

    [ObservableProperty] private string _currentPage = "Approvals";
    [ObservableProperty] private bool _isLoading;
    [ObservableProperty] private string _statusMessage = "Ready";

    public ObservableCollection<ApprovalRequestDto> Approvals { get; } = [];
    public ObservableCollection<InspectionDto> Inspections { get; } = [];
    public ObservableCollection<AuditLogDto> AuditLogs { get; } = [];

    [ObservableProperty] private ApprovalRequestDto? _selectedApproval;
    [ObservableProperty] private InspectionDto? _selectedInspection;
    [ObservableProperty] private string _decisionComments = "";
    [ObservableProperty] private string _currentUser = "quality.manager";

    public MainViewModel(QualityApiClient api)
    {
        _api = api;
    }

    [RelayCommand]
    public async Task LoadApprovalsAsync()
    {
        IsLoading = true;
        CurrentPage = "Approvals";
        try
        {
            var items = await _api.GetApprovalsAsync();
            Approvals.Clear();
            foreach (var a in items) Approvals.Add(a);
            StatusMessage = $"Loaded {items.Count} approvals";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsLoading = false; }
    }

    [RelayCommand]
    public async Task LoadInspectionsAsync()
    {
        IsLoading = true;
        CurrentPage = "Inspections";
        try
        {
            var items = await _api.GetInspectionsAsync();
            Inspections.Clear();
            foreach (var i in items) Inspections.Add(i);
            StatusMessage = $"Loaded {items.Count} inspections";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsLoading = false; }
    }

    [RelayCommand]
    public async Task LoadAuditLogsAsync()
    {
        IsLoading = true;
        CurrentPage = "Audit";
        try
        {
            var items = await _api.GetAuditLogsAsync();
            AuditLogs.Clear();
            foreach (var l in items) AuditLogs.Add(l);
            StatusMessage = $"Loaded {items.Count} audit logs";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsLoading = false; }
    }

    [RelayCommand]
    public async Task ApproveAsync()
    {
        if (SelectedApproval is null) return;
        IsLoading = true;
        try
        {
            await _api.ApproveAsync(SelectedApproval.Id, CurrentUser, DecisionComments);
            DecisionComments = "";
            StatusMessage = "Approved successfully";
            await LoadApprovalsAsync();
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsLoading = false; }
    }

    [RelayCommand]
    public async Task RejectAsync()
    {
        if (SelectedApproval is null) return;
        IsLoading = true;
        try
        {
            await _api.RejectAsync(SelectedApproval.Id, CurrentUser, DecisionComments);
            DecisionComments = "";
            StatusMessage = "Rejected";
            await LoadApprovalsAsync();
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsLoading = false; }
    }
}
